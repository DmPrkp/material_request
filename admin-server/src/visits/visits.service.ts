import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { open, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Client, escapeIdentifier, Pool } from 'pg';

import { foldHits, type Hit, parseHit } from './hits';
import { type Cursor, readCursor, upsertVisitors, writeCursor } from './visits.store';

/**
 * Как часто дочитывать лог. Счёт заходов от этого не зависит — паузы берутся из времени
 * в строках, а не из момента чтения, — поэтому редко: базу дёргаем раз в 5 минут, а
 * «Посетители» отстают от жизни не больше чем на столько же. Запросы сайта не ждут ни того,
 * ни другого: nginx только дописывает файл. Накопленное за паузу читается кусками по CHUNK.
 */
const TICK_MS = 5 * 60 * 1000;
/** Больше за один заход не читаем — после долгого простоя файл догоняется кусками. */
const CHUNK = 4 * 1024 * 1024;

export const STATS_DATABASE = process.env.STATS_DATABASE ?? 'stats';
const LOG = process.env.VISITS_LOG ?? join(process.env.ERROR_LOGS_DIR ?? '/var/log/matli', 'visits.jsonl');

/**
 * Подключение к своей базе stats. Не read-only роль, как у остальных баз: здесь админка
 * пишет сама, и базу (с миграциями) заводит тоже сама. Без STATS_DB_* статистика выключена,
 * админка работает дальше.
 */
export function statsConfig() {
  const user = process.env.STATS_DB_USER;
  const password = process.env.STATS_DB_PASSWORD;
  if (!user || !password || !process.env.DB_HOST) return undefined;
  return { host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 5432), user, password };
}

/**
 * Статистика посетителей: дочитывает access-лог nginx (logs/visits.jsonl, формат `visits`
 * в nginx/main.conf) и сворачивает его в visitors. Отдельно от запросов сайта — nginx пишет
 * строку и забывает, а считает всё это admin-server в фоне.
 */
@Injectable()
export class VisitsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(VisitsService.name);
  private pool?: Pool;
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private cursor?: Cursor;
  private missingLogged = false;

  onModuleInit(): void {
    const config = statsConfig();
    if (!config) {
      this.logger.warn('STATS_DB_USER/STATS_DB_PASSWORD не заданы — статистика посетителей выключена');
      return;
    }
    // Не ждём: подъём базы и миграция не должны задерживать старт админки.
    void this.start(config);
  }

  async onApplicationShutdown(): Promise<void> {
    clearInterval(this.timer);
    await this.pool?.end();
  }

  private async start(config: NonNullable<ReturnType<typeof statsConfig>>): Promise<void> {
    try {
      await ensureDatabase(config);
      this.pool = new Pool({ ...config, database: STATS_DATABASE, max: 2 });
      // Путь от корня пакета: в dev сервис гоняется из src, в образе — из dist.
      await migrate(drizzle(this.pool), { migrationsFolder: join(process.cwd(), 'drizzle') });
      this.cursor = await readCursor(this.pool);
      this.timer = setInterval(() => void this.tick(), TICK_MS);
      // Сразу, не дожидаясь первых 5 минут: после рестарта накопленное видно сразу.
      void this.tick();
      this.logger.log(`Статистика посетителей: читаю ${LOG}`);
    } catch (error) {
      this.logger.error('Статистика посетителей не поднялась', error as Error);
    }
  }

  /** Один заход: дочитать всё новое, кусками по CHUNK. Пересечься с собой не может — busy. */
  async tick(): Promise<void> {
    if (this.busy || !this.pool) return;
    this.busy = true;
    try {
      while (await this.readChunk()) {
        // читаем дальше, пока кусок был полным
      }
    } catch (error) {
      this.logger.error('Не удалось дочитать лог посещений', error as Error);
    } finally {
      this.busy = false;
    }
  }

  /** true — прочитан полный кусок, за ним может быть ещё. */
  private async readChunk(): Promise<boolean> {
    let info;
    try {
      info = await stat(LOG);
    } catch {
      // nginx заводит файл с первым запросом — до него читать нечего.
      if (!this.missingLogged) this.logger.warn(`Нет ${LOG} — жду первого запроса через nginx`);
      this.missingLogged = true;
      return false;
    }
    this.missingLogged = false;

    const fileId = `${info.dev}:${info.ino}`;
    // Файл пересоздали или усекли (`: > logs/visits.jsonl`) — читаем сначала.
    let offset =
      this.cursor && this.cursor.fileId === fileId && this.cursor.offset <= info.size
        ? this.cursor.offset
        : 0;
    if (offset >= info.size) return false;

    const length = Math.min(CHUNK, info.size - offset);
    const buffer = Buffer.alloc(length);
    const handle = await open(LOG, 'r');
    try {
      await handle.read(buffer, 0, length, offset);
    } finally {
      await handle.close();
    }

    // Только целые строки: последняя может быть дописана nginx наполовину.
    const end = buffer.lastIndexOf(0x0a);
    if (end < 0) {
      // Полный кусок без единого перевода строки — не строка лога, а мусор: перешагнуть,
      // иначе позиция застряла бы на нём навсегда.
      if (length === CHUNK) this.cursor = { fileId, offset: offset + length };
      return false;
    }
    const hits = buffer
      .subarray(0, end)
      .toString('utf8')
      .split('\n')
      .map(parseHit)
      .filter((hit): hit is Hit => !!hit);
    offset += end + 1;

    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      await upsertVisitors(client, foldHits(hits));
      await writeCursor(client, { fileId, offset });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    this.cursor = { fileId, offset };
    return length === CHUNK;
  }
}

/**
 * Базу stats заводим сами, как сервисы свои (их src/db/migrate.ts): db/init срабатывает
 * только на пустом томе, а на живом dev и на проде база появилась бы лишь руками.
 */
async function ensureDatabase(config: NonNullable<ReturnType<typeof statsConfig>>): Promise<void> {
  const client = new Client({ ...config, database: 'postgres' });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [STATS_DATABASE]);
    if (!rowCount) await client.query(`CREATE DATABASE ${escapeIdentifier(STATS_DATABASE)}`);
  } finally {
    await client.end();
  }
}

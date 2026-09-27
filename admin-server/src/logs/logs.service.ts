import { Injectable, NotFoundException } from '@nestjs/common';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { type LogEntry, newestFirst, parseLog, serviceOf } from './parse';

/**
 * Каталог logs/ проекта, смонтированный только на чтение (compose). Имя переменной — не
 * LOG_DIR: так сервисы зовут каталог, куда они пишут, а админка в него не пишет.
 */
const DIR = process.env.ERROR_LOGS_DIR ?? '/var/log/matli';

/** Больше записей в браузер не везём; файлы сервисов и так режутся ротацией на 5 МБ. */
export const ENTRY_LIMIT = 5000;

/** Только лог-файлы и их ротация (.log.1) — никаких путей: имя приходит из URL. */
const LOG_FILE = /^[\w.-]+\.log(\.\d+)?$/;

export type LogFile = { name: string; service: string; size: number; modifiedAt: string };

@Injectable()
export class LogsService {
  async files(): Promise<LogFile[]> {
    let names: string[];
    try {
      names = await readdir(DIR);
    } catch {
      // Каталога нет — ни один сервис ещё ничего не записал (файлы появляются с первой ошибкой).
      return [];
    }
    const files = await Promise.all(
      names
        .filter((name) => LOG_FILE.test(name))
        .map(async (name) => {
          const info = await stat(join(DIR, name));
          return { name, service: serviceOf(name), size: info.size, modifiedAt: info.mtime.toISOString() };
        }),
    );
    return files.sort((a, b) => a.name.localeCompare(b.name));
  }

  async entries(): Promise<{
    dir: string;
    files: LogFile[];
    entries: LogEntry[];
    total: number;
    limit: number;
  }> {
    const files = await this.files();
    const all = (
      await Promise.all(
        files.map(async (file) => parseLog(file.name, await readFile(join(DIR, file.name), 'utf8'))),
      )
    ).flat();
    all.sort(newestFirst);
    return { dir: DIR, files, entries: all.slice(0, ENTRY_LIMIT), total: all.length, limit: ENTRY_LIMIT };
  }

  async raw(name: string): Promise<string> {
    if (!LOG_FILE.test(name)) throw new NotFoundException();
    try {
      return await readFile(join(DIR, name), 'utf8');
    } catch {
      throw new NotFoundException(`Нет файла ${name}`);
    }
  }
}

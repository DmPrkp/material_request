/**
 * Заводит базу, если её нет, и накатывает миграции из drizzle/ — их пишет
 * `npm run db:generate` по src/db/schema.ts. Журнал — drizzle.__drizzle_migrations.
 *
 * База заводится здесь, а не только в db/init: тот срабатывает лишь на пустом томе,
 * и на уже поднятом dev-стеке базы `warehouse` не было бы без `down -v`, то есть без
 * потери данных остальных сервисов. На проде то же: каталог данных живёт дольше любого релиза.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client, escapeIdentifier, Pool } from 'pg';

import { logError } from '../common/error-log';
import { databaseUrl } from './config';

async function ensureDatabase(url: string): Promise<void> {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));
  // Служебная база `postgres` есть всегда — из неё и заводим свою.
  target.pathname = '/postgres';

  const client = new Client({ connectionString: target.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (rowCount) return;
    await client.query(`CREATE DATABASE ${escapeIdentifier(name)}`);
    console.log(`✓ база ${name} заведена`);
  } finally {
    await client.end();
  }
}

async function main() {
  const url = databaseUrl();
  try {
    await ensureDatabase(url);
  } catch (error) {
    // Нет прав на CREATE DATABASE — не повод падать, если базу завели руками;
    // если не завели, migrate ниже упадёт с понятным «database does not exist».
    console.warn('! не удалось проверить или завести базу, пробую как есть:', (error as Error).message);
  }

  const pool = new Pool({ connectionString: url });
  try {
    // Путь от корня пакета, а не от файла: скрипт гоняется tsx из src/, а в образе лежит dist/.
    const folder = join(process.cwd(), 'drizzle');
    await migrate(drizzle(pool), { migrationsFolder: folder });
    console.log('✓ миграции применены');
    await warnIfAppliedChanged(pool, folder);
  } finally {
    await pool.end();
  }
}

/**
 * Проверяет, не правили ли уже применённую миграцию. Drizzle решает, что применять, только
 * по `when` из журнала против `created_at` последней записи в базе; хеш файла он пишет, но
 * не сверяет, — поэтому правка применённого файла молча не доезжает. Так лёг прод
 * 26.09.2026: переименование таблицы внутри `0000_init.sql` с прежним `when`, старт прошёл
 * успешно, а сервис отдавал 500 на всё, что трогает базу. Хеш в базе лежит — сверяем сами.
 *
 * Не роняем старт, а предупреждаем: расхождение бывает и уже вылеченным (базу догнали руками
 * ALTER-ом, а хеш в журнале остался от прежнего текста файла), и падать в этом случае значило бы
 * ронять рабочий сервис. Запись видна там же, где мы теперь ищем ошибки.
 */
async function warnIfAppliedChanged(pool: Pool, folder: string): Promise<void> {
  try {
    const journal = JSON.parse(readFileSync(join(folder, 'meta/_journal.json'), 'utf8')) as {
      entries: { tag: string; when: number }[];
    };

    const { rows } = await pool.query<{ hash: string; created_at: string }>(
      'select hash, created_at from drizzle.__drizzle_migrations',
    );
    if (!rows.length) return;

    const applied = new Set(rows.map((row) => row.hash));
    const latest = Math.max(...rows.map((row) => Number(row.created_at)));

    for (const entry of journal.entries) {
      // Ещё не применённая (`when` новее последней записи) — не расхождение, а работа на будущее.
      if (entry.when > latest) continue;

      const sql = readFileSync(join(folder, `${entry.tag}.sql`), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      if (applied.has(hash)) continue;

      logError(
        'migrate',
        new Error(
          `миграция ${entry.tag} изменилась после применения: база отстала от репозитория. ` +
            'Правку применённого файла drizzle не накатывает — нужна новая миграция, ' +
            'а базу догнать руками',
        ),
      );
    }
  } catch (error) {
    // Диагностика не обязана работать: не смогли проверить — миграции всё равно применены.
    console.warn('! не удалось сверить миграции с базой:', (error as Error).message);
  }
}

main().catch((error) => {
  logError('migrate', error);
  process.exit(1);
});

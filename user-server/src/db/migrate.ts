/**
 * Заводит базу, если её нет, и накатывает миграции из drizzle/ — их пишет
 * `npm run db:generate` по src/db/schema.ts. Журнал — drizzle.__drizzle_migrations.
 *
 * База заводится здесь, а не только в db/init: тот срабатывает лишь на пустом томе,
 * и на уже поднятом dev-стеке базы `user` не было бы без `down -v`, то есть без
 * потери данных остальных сервисов. На проде то же: каталог данных живёт дольше любого релиза.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { Client, escapeIdentifier, Pool } from 'pg';

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
    await migrate(drizzle(pool), { migrationsFolder: join(process.cwd(), 'drizzle') });
    console.log('✓ миграции применены');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('✗ миграции не применились', error);
  process.exit(1);
});

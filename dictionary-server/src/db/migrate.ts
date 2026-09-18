/**
 * Накатывает миграции из drizzle/ — их пишет `npm run db:generate` по src/db/schema.ts.
 *
 * Раньше dev-контейнер синхронизировал схему `drizzle-kit push --force`: тот сносил всё,
 * чего нет в схеме, а на `NULLS NOT DISTINCT` падал при каждом старте, и новые колонки
 * до базы не доезжали. Миграции применяются по журналу (drizzle.__drizzle_migrations)
 * и повторно не накатываются.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { Pool } from 'pg';

import { databaseUrl } from './config';

async function main() {
  const pool = new Pool({ connectionString: databaseUrl() });
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

/**
 * Секреты лежат как у остальных сервисов (POSTGRES_* + DB_HOST/DB_PORT),
 * но drizzle-kit хочет одну строку подключения — собираем её здесь,
 * чтобы формат env-файлов остался общим для всего проекта.
 */
export function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const { DB_HOST, DB_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  const missing = Object.entries({ DB_HOST, DB_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(`Не заданы переменные окружения для БД: ${missing.join(', ')}`);
  }

  const auth = `${encodeURIComponent(POSTGRES_USER!)}:${encodeURIComponent(POSTGRES_PASSWORD!)}`;
  return `postgresql://${auth}@${DB_HOST}:${DB_PORT}/${POSTGRES_DB}`;
}

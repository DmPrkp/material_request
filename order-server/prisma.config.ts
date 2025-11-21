import { defineConfig } from '@prisma/config';

function buildDatabaseUrl() {
  const directUrl = process.env.DATABASE_URL;
  if (directUrl && directUrl.trim().length > 0) {
    return directUrl;
  }

  const user = process.env.POSTGRES_USER ?? 'postgres';
  const password = process.env.POSTGRES_PASSWORD ?? 'postgres';
  const host = process.env.DB_HOST ?? process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? process.env.POSTGRES_PORT ?? '5432';
  const database = process.env.POSTGRES_DB ?? process.env.DATABASE_NAME ?? 'postgres';

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasources: {
    db: {
      url: buildDatabaseUrl(),
    },
  },
});

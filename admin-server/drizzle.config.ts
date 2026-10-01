import { defineConfig } from 'drizzle-kit';

// Только своя база stats (src/visits/schema.ts): остальные базы админка читает, но не ведёт.
// Строка подключения генерации не нужна — drizzle-kit generate сверяет схему со снимком в drizzle/.
export default defineConfig({
  schema: './src/visits/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  verbose: true,
  strict: true,
});

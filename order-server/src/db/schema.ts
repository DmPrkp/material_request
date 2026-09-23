import { index, integer, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Заявка — расчёт целиком, как его собрал клиент: состав не разбирается на таблицы,
 * потому что сервис его не читает, только хранит и отдаёт (и выгружает в ods).
 *
 * data — объект в jsonb. При Prisma туда писали JSON.stringify(...), и в базе лежала
 * строка с JSON внутри: `data->>'name'` не работал ни в SQL, ни в админке. Наружу API
 * по-прежнему отдаёт data строкой (zaiavka.service.ts → toPublic) — клиент её парсит сам.
 *
 * user — автор, sub из токена, без FK: пользователи в другой базе. NULL — заведена без
 * входа, править её может тот, у кого ключ; после входа он забирает её себе (claim).
 * В базе колонка user_id: `user` в Postgres — зарезервированное слово.
 *
 * editKeyHash — sha256 ключа правки ничьей заявки; сам ключ — только в браузере автора.
 */
export const zaiavki = pgTable(
  'zaiavki',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    user: integer('user_id'),
    editKeyHash: varchar('edit_key_hash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Список «мои заявки» и чистка ничьих ищут по автору.
    index('zaiavki_user_idx').on(t.user),
  ],
);

export type Zaiavka = typeof zaiavki.$inferSelect;

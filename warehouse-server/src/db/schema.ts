import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

/**
 * Склад пользователя.
 *
 * owner_id — sub из токена user-server, без FK: пользователи живут в другой базе,
 * межбазовых ссылок в Postgres нет. Из тела запроса владелец не принимается.
 *
 * is_active — мягкое удаление, как в словаре: на склад будут ссылаться остатки
 * и движения, и физически сносить его по первому клику незачем.
 */
export const warehouses = pgTable(
  'warehouses',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    ownerId: integer('owner_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    address: varchar('address', { length: 300 }),
    description: varchar('description', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Название уникально у владельца без учёта регистра, но только среди действующих:
    // удалённый «Основной» не мешает завести новый «Основной». Вернуть архивный при
    // живом тёзке не даст этот же индекс — 409 (PgConstraintFilter).
    uniqueIndex('warehouses_owner_name_active_uq')
      .on(t.ownerId, sql`lower(${t.name})`)
      .where(sql`${t.isActive}`),
    // Список фильтрует по владельцу при любом state, а уникальный индекс частичный.
    index('warehouses_owner_idx').on(t.ownerId),
  ],
);

export type Warehouse = typeof warehouses.$inferSelect;

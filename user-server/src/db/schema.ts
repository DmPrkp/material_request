import { integer, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * USER — всем при регистрации, ADMIN — только заведённому при старте (default-admin.service.ts)
 * или выданному руками. Роль в токене — для других сервисов; сам user-server ей не верит
 * и перечитывает из этой таблицы (auth.guard.ts).
 */
export const ROLES = ['USER', 'ADMIN'] as const;
export const role = pgEnum('role', ROLES);
export type Role = (typeof ROLES)[number];

/**
 * На id пользователя ссылаются без FK все остальные базы (created_by, owner_id, user_id,
 * Zayavka.user…): межбазовых ссылок в Postgres нет. Удалённый пользователь оставит там висячие id.
 *
 * login хранится в нижнем регистре (auth.dto.ts), поэтому уникальность — простым индексом,
 * без lower(). Ограничение длины — у регистрации; колонка шире, чтобы логин админа из
 * DEFAULT_ADMIN_LOGIN не упирался в правила формата.
 */
export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  login: varchar('login', { length: 64 }).notNull().unique(),
  /** bcrypt-хеш, не пароль. Наружу — никогда: только через toPublicUser(). */
  password: text('password').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  role: role('role').notNull().default('USER'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Роли участника в компании: владение, управление, проверка, хранение.
 * Порядок здесь — порядок выдачи наружу (roles.ts сортирует по нему).
 */
export const COMPANY_ROLES = ['own', 'manage', 'review', 'store'] as const;
export const companyRole = pgEnum('company_role', COMPANY_ROLES);
export type CompanyRole = (typeof COMPANY_ROLES)[number];

/**
 * Компания. Владельца на самой компании нет: владеет тот, у кого роль own в
 * company_members, — иначе у «кто владеет» было бы два источника правды.
 */
export const companies = pgTable('companies', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 200 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Участник компании и его роли.
 *
 * user_id — sub из токена user-server, без FK: пользователи в другой базе. Членство
 * живёт здесь, а не в user-server, чтобы создание компании с владельцем и любая правка
 * ролей были одной транзакцией одного сервиса, без саги.
 *
 * Роли — массивом на строке участника, а не строкой на роль: участник — сущность
 * (с датой вступления), и «убрать из компании» — это удалить одну строку.
 */
export const companyMembers = pgTable(
  'company_members',
  {
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull(),
    roles: companyRole('roles').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.userId] }),
    // Участник без ролей — это уже не участник: убирают его DELETE, а не пустым набором.
    check('company_members_roles_present', sql`cardinality(${t.roles}) > 0`),
    // Список «мои компании» ищет по пользователю.
    index('company_members_user_idx').on(t.userId),
  ],
);

export type Company = typeof companies.$inferSelect;
export type CompanyMember = typeof companyMembers.$inferSelect;

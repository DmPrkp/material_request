import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Склад пользователя.
 *
 * owner_id — sub из токена user-server, без FK: пользователи живут в другой базе,
 * межбазовых ссылок в Postgres нет. Из тела запроса владелец не принимается.
 *
 * company_id — компания, которой принадлежит склад (многие к одной), тоже без FK: компания
 * в company-server. Без компании склад личный. Её own/manage правят склад и назначают на
 * него пользователей (warehouse_users) — только из участников той же компании.
 *
 * is_active — мягкое удаление, как в словаре: на склад будут ссылаться остатки
 * и движения, и физически сносить его по первому клику незачем.
 *
 * holder_user_id — «на руках»: не место, а человек, которому компания выдала позиции.
 * Такой склад всегда компании (выданное — её имущество, а не личное держателя) и у
 * человека один на компанию; заводится сам при первой выдаче (items.service.ts → issue),
 * owner_id у него — кто выдал впервые, прав это не даёт (access.ts).
 */
export const warehouses = pgTable(
  'warehouses',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    ownerId: integer('owner_id').notNull(),
    companyId: integer('company_id'),
    holderUserId: integer('holder_user_id'),
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
    // «Руки» из правила выпадают: их заводит первый выдавший, и у кладовщика, выдавшего
    // троим, было бы три одноимённых склада.
    uniqueIndex('warehouses_owner_name_active_uq')
      .on(t.ownerId, sql`lower(${t.name})`)
      .where(sql`${t.isActive} and ${t.holderUserId} is null`),
    // Список фильтрует по владельцу при любом state, а уникальный индекс частичный.
    index('warehouses_owner_idx').on(t.ownerId),
    // Склады компании: ?companyId= и доступ её own/manage.
    index('warehouses_company_idx').on(t.companyId),
    // Одни «руки» на человека в компании: параллельная первая выдача двоим кладовщикам
    // упрётся сюда, а не заведёт вторые (issue ловит конфликт и берёт существующие).
    uniqueIndex('warehouses_holder_uq').on(t.companyId, t.holderUserId),
    check('warehouses_holder_in_company', sql`${t.holderUserId} is null or ${t.companyId} is not null`),
  ],
);

/**
 * Пользователи, назначенные на склад (многие ко многим). Назначает own/manage компании
 * склада, и только её участника — это проверяется у company-server в момент назначения.
 * Уйдёт человек из компании потом — назначение останется, пока его не снимут: межбазовых
 * ссылок нет, и company-server о складах не знает. Назначение даёт только чтение
 * (правила — modules/warehouses/access.ts).
 */
export const warehouseUsers = pgTable(
  'warehouse_users',
  {
    warehouseId: integer('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.warehouseId, t.userId] }),
    // Список «мои склады» ищет и по привязке.
    index('warehouse_users_user_idx').on(t.userId),
  ],
);

/**
 * Что лежит на складе. Позиция названа как в нормах расхода calc-server: материал и
 * ручной инструмент — кодом сборки (uniqKey в заявке), электроинструмент — id позиции,
 * сборок у него нет. Отсюда ref строкой на оба случая и kind рядом.
 *
 * Названий здесь нет намеренно: их отдаёт словарь по тем же кодам
 * (GET /{material,hand-tool}-variants?codes=, /power-tools/lookup?ids=). Перепишут
 * сборку — код сменится, и позиция на складе останется старой, как норма расхода:
 * это другая сборка, а не переименованная.
 */
export const WAREHOUSE_ITEM_KINDS = ['material', 'hand_tool', 'power_tool'] as const;
export const warehouseItemKind = pgEnum('warehouse_item_kind', WAREHOUSE_ITEM_KINDS);
export type WarehouseItemKind = (typeof WAREHOUSE_ITEM_KINDS)[number];

export const warehouseItems = pgTable(
  'warehouse_items',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    warehouseId: integer('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    kind: warehouseItemKind('kind').notNull(),
    ref: varchar('ref', { length: 64 }).notNull(),
    // numeric, а не float: количества складывают и правят руками, и 0.1 + 0.2 здесь
    // не должно превращаться в 0.30000000000000004. Наружу уходит числом.
    quantity: numeric('quantity', { precision: 14, scale: 4 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Одна строка на позицию: повторное добавление той же складывается с прежним.
    unique('warehouse_items_ref_uq').on(t.warehouseId, t.kind, t.ref),
    check('warehouse_items_quantity_positive', sql`${t.quantity} > 0`),
  ],
);

export type Warehouse = typeof warehouses.$inferSelect;
export type WarehouseItem = typeof warehouseItems.$inferSelect;
export type WarehouseUser = typeof warehouseUsers.$inferSelect;

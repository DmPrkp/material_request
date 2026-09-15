import { relations, sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Колонки, которые есть у каждой позиции справочника.
 * isActive — мягкое удаление: позицию нельзя удалить физически, пока на неё
 * ссылаются нормы расхода в calc-server (FK через границу сервисов не работает).
 */
const lifecycle = {
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Учёт залитых сид-файлов.
 *
 * Обязана быть объявлена здесь: `drizzle-kit push --force` сносит из базы всё,
 * чего нет в этой схеме — включая служебные таблицы.
 */
export const seedHistory = pgTable('seed_history', {
  filename: text('filename').primaryKey(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ единицы */

/** Бывш. свободная строка `measure` в params / materials / power_tool_params. */
export const units = pgTable('units', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  code: varchar('code', { length: 16 }).notNull().unique(),
  nameRu: varchar('name_ru', { length: 50 }).notNull(),
  nameEn: varchar('name_en', { length: 50 }).notNull(),
  ...lifecycle,
});

/** Бывш. params_titles — вид параметра (длина, диаметр, напряжение). */
export const paramKinds = pgTable('param_kinds', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  nameRu: varchar('name_ru', { length: 50 }).notNull(),
  nameEn: varchar('name_en', { length: 50 }).notNull(),
  ...lifecycle,
});

/**
 * Бывш. params — значение с единицей. `parameter VARCHAR` стал `value NUMERIC`.
 *
 * Вид параметра живёт здесь, а не на связке с типоразмером. Пока он был на
 * связке, одно и то же «8 мм» можно было пометить diameter у одного материала
 * и length у другого — что и случилось с параметрами 207 и 208. Теперь такое
 * невыразимо: у значения ровно один вид.
 *
 * Обратная сторона: «100 мм как длина» и «100 мм как ширина» — это две разные
 * строки. Поэтому уникальность по тройке, а не по паре.
 *
 * kindId необязателен: у 91 значения из 118 вид в исходных данных не задан
 * (метры для рулеток и часть неиспользуемых значений).
 */
export const paramValues = pgTable(
  'param_values',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    kindId: integer('kind_id').references(() => paramKinds.id, { onDelete: 'restrict' }),
    value: numeric('value', { precision: 12, scale: 4 }).notNull(),
    unitId: integer('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'restrict' }),
    ...lifecycle,
  },
  (t) => [
    // nullsNotDistinct: иначе два значения без вида с одинаковым числом
    // проскочили бы мимо ограничения — NULL в Postgres по умолчанию не равен NULL
    unique('param_values_kind_value_unit_uq').on(t.kindId, t.value, t.unitId).nullsNotDistinct(),
    index('param_values_unit_idx').on(t.unitId),
    index('param_values_kind_idx').on(t.kindId),
  ],
);

/* ---------------------------------------------------------------- структура */

/**
 * Кто завёл запись — id пользователя из user-server (sub в JWT).
 *
 * Без FK: пользователи живут в другой базе. NULL — запись из сидов, её никто
 * не добавлял руками. Проставляет только API, из тела запроса не принимается.
 */
const authorship = {
  createdBy: integer('created_by'),
};

/**
 * Автор плюс флаг «видят все» — у позиций со своими правами. У этапов его нет: их
 * видимость и права целиком от технологии, и свой флаг только разошёлся бы с ней.
 *
 * isShared — видят все (сиды и заведённое админом); false — только автор и админ
 * (common/ownership.ts). Роль автора запоминается здесь, потому что кто админ, знает
 * только user-server. По умолчанию true — сиды общие.
 */
const ownership = {
  ...authorship,
  isShared: boolean('is_shared').notNull().default(true),
};

/**
 * Вид работ: фасад, кровля, внутренняя отделка — верхний уровень над технологиями
 * (systems). Отдельная таблица, а не строка у технологии: виды будут добавляться,
 * и у каждого своё название на двух языках.
 */
export const workTypes = pgTable('work_types', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  /** Сегмент адреса на клиенте (/catalog/systems/facade) и ключ картинки плитки. */
  code: varchar('code', { length: 32 }).notNull().unique(),
  nameRu: varchar('name_ru', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }).notNull(),
  ...ownership,
  ...lifecycle,
});

/**
 * Название этапа или технологии на двух языках. Пишется только на языке, на котором
 * человек работал в интерфейсе, остальные остаются пустыми; наружу уходит одно
 * name — на языке запроса или ближайшее заполненное (common/localize.ts).
 */
const names = {
  nameRu: varchar('name_ru', { length: 100 }),
  nameEn: varchar('name_en', { length: 100 }),
};

/**
 * Пустыми все языки быть не могут: такую запись не показать ни под одним адресом.
 * Держит база, а не только схема API: правкой можно стереть последнее название.
 */
const namePresent = (table: string, t: { nameRu: AnyPgColumn; nameEn: AnyPgColumn }) =>
  check(`${table}_name_present`, sql`coalesce(${t.nameRu}, '') <> '' or coalesce(${t.nameEn}, '') <> ''`);

/**
 * Технология работ (в интерфейсе — «технология», в API и базе — systems).
 *
 * title — технический код, людям его не показывают: по нему ходят calc-server
 * (/:workType/:system) и ключи i18n калькулятора. У заведённых с клиента его
 * генерирует сервис (common/code.ts).
 */
export const systems = pgTable(
  'systems',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    title: varchar('title', { length: 50 }).notNull().unique(),
    ...names,
    descriptionRu: varchar('description_ru', { length: 200 }),
    descriptionEn: varchar('description_en', { length: 200 }),
    workTypeId: integer('work_type_id')
      .notNull()
      .references(() => workTypes.id, { onDelete: 'restrict' }),
    ...ownership,
    ...lifecycle,
  },
  (t) => [index('systems_work_type_idx').on(t.workTypeId), namePresent('systems', t)],
);

/**
 * Бывш. components — этап/слой работ внутри системы. `layer` стал `position`.
 * title — технический код, как у технологии; людям — name.
 */
export const workStages = pgTable(
  'work_stages',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    title: varchar('title', { length: 50 }).notNull().unique(),
    ...names,
    position: smallint('position').notNull(),
    systemId: integer('system_id')
      .notNull()
      .references(() => systems.id, { onDelete: 'restrict' }),
    ...authorship,
    ...lifecycle,
  },
  (t) => [
    index('work_stages_system_idx').on(t.systemId),
    uniqueIndex('work_stages_system_position_uq').on(t.systemId, t.position),
    namePresent('work_stages', t),
  ],
);

/* ----------------------------------------------------------------- позиции */

export const handTools = pgTable(
  'hand_tools',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    // Как у материалов: с клиента пишется язык страницы, остальные пустые (namePresent).
    nameRu: varchar('name_ru', { length: 100 }),
    nameEn: varchar('name_en', { length: 100 }),
    ...ownership,
    ...lifecycle,
  },
  (t) => [
    namePresent('hand_tools', t),
    // Уникально у одного автора, а не во всей таблице: копия чужого «шпателя» при правке
    // его сборки (CrudService.fork) законно носит то же имя. coalesce — сиды (NULL) между
    // собой тоже не должны совпадать; пустые переводы (NULL в имени) друг другу не мешают.
    // Только среди живых: удалённый «молоток» не мешает завести «молоток» заново.
    uniqueIndex('hand_tools_name_ru_author_uq')
      .on(t.nameRu, sql`coalesce(${t.createdBy}, 0)`)
      .where(sql`${t.isActive}`),
    uniqueIndex('hand_tools_name_en_author_uq')
      .on(t.nameEn, sql`coalesce(${t.createdBy}, 0)`)
      .where(sql`${t.isActive}`),
  ],
);

export const powerTools = pgTable('power_tools', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  nameRu: varchar('name_ru', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }).notNull(),
  isCorded: boolean('is_corded').notNull(),
  ...ownership,
  ...lifecycle,
});

/**
 * Тип материала: пиломатериалы, крепёж, сухие смеси, строительные леса…
 * Отдельная таблица, связь необязательная — у материала типа может не быть.
 */
export const materialTypes = pgTable('material_types', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  nameRu: varchar('name_ru', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }).notNull(),
  ...lifecycle,
});

export const materials = pgTable(
  'materials',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    // Как у технологий: с клиента пишется язык страницы, остальные пустые (namePresent).
    nameRu: varchar('name_ru', { length: 150 }),
    nameEn: varchar('name_en', { length: 150 }),
    descriptionRu: text('description_ru'),
    descriptionEn: text('description_en'),
    unitId: integer('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'restrict' }),
    /** Необязательный: часть материалов пока не разнесена по типам. */
    typeId: integer('type_id').references(() => materialTypes.id, { onDelete: 'set null' }),
    ...ownership,
    ...lifecycle,
  },
  (t) => [
    index('materials_unit_idx').on(t.unitId),
    index('materials_type_idx').on(t.typeId),
    namePresent('materials', t),
  ],
);

/* ---------------------------------------------------------------- варианты */

/** Бывш. assembled_hand_tools. `uniq_key` стал `code`, лимит поднят с 10 до 64. */
export const handToolVariants = pgTable(
  'hand_tool_variants',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    code: varchar('code', { length: 64 }).notNull().unique(),
    handToolId: integer('hand_tool_id')
      .notNull()
      .references(() => handTools.id, { onDelete: 'restrict' }),
    ...lifecycle,
  },
  (t) => [index('hand_tool_variants_tool_idx').on(t.handToolId)],
);

/** Бывш. assembled_materials. */
export const materialVariants = pgTable(
  'material_variants',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    code: varchar('code', { length: 64 }).notNull().unique(),
    materialId: integer('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    ...lifecycle,
  },
  (t) => [index('material_variants_material_idx').on(t.materialId)],
);

/**
 * Бывш. hand_tool_params. Первичного ключа не было — дубли размножали строки
 * в ARRAY_AGG и тихо портили расчёт.
 * Вид параметра сюда больше не пишется: он на самом значении.
 */
export const handToolVariantParams = pgTable(
  'hand_tool_variant_params',
  {
    variantId: integer('variant_id')
      .notNull()
      .references(() => handToolVariants.id, { onDelete: 'cascade' }),
    paramValueId: integer('param_value_id')
      .notNull()
      .references(() => paramValues.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ columns: [t.variantId, t.paramValueId] }),
    index('hand_tool_variant_params_value_idx').on(t.paramValueId),
  ],
);

/** Бывш. material_params. Вид параметра — на значении, а не здесь. */
export const materialVariantParams = pgTable(
  'material_variant_params',
  {
    variantId: integer('variant_id')
      .notNull()
      .references(() => materialVariants.id, { onDelete: 'cascade' }),
    paramValueId: integer('param_value_id')
      .notNull()
      .references(() => paramValues.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ columns: [t.variantId, t.paramValueId] }),
    index('material_variant_params_value_idx').on(t.paramValueId),
  ],
);

/* --------------------------------------------------------------- отношения */

export const unitsRelations = relations(units, ({ many }) => ({
  paramValues: many(paramValues),
  materials: many(materials),
}));

export const paramKindsRelations = relations(paramKinds, ({ many }) => ({
  paramValues: many(paramValues),
}));

export const paramValuesRelations = relations(paramValues, ({ one, many }) => ({
  unit: one(units, { fields: [paramValues.unitId], references: [units.id] }),
  kind: one(paramKinds, { fields: [paramValues.kindId], references: [paramKinds.id] }),
  handToolVariantParams: many(handToolVariantParams),
  materialVariantParams: many(materialVariantParams),
}));

export const workTypesRelations = relations(workTypes, ({ many }) => ({
  systems: many(systems),
}));

export const systemsRelations = relations(systems, ({ one, many }) => ({
  workType: one(workTypes, { fields: [systems.workTypeId], references: [workTypes.id] }),
  workStages: many(workStages),
}));

export const workStagesRelations = relations(workStages, ({ one }) => ({
  system: one(systems, { fields: [workStages.systemId], references: [systems.id] }),
}));

export const handToolsRelations = relations(handTools, ({ many }) => ({
  variants: many(handToolVariants),
}));

export const materialTypesRelations = relations(materialTypes, ({ many }) => ({
  materials: many(materials),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  unit: one(units, { fields: [materials.unitId], references: [units.id] }),
  type: one(materialTypes, { fields: [materials.typeId], references: [materialTypes.id] }),
  variants: many(materialVariants),
}));

export const handToolVariantsRelations = relations(handToolVariants, ({ one, many }) => ({
  handTool: one(handTools, { fields: [handToolVariants.handToolId], references: [handTools.id] }),
  params: many(handToolVariantParams),
}));

export const materialVariantsRelations = relations(materialVariants, ({ one, many }) => ({
  material: one(materials, { fields: [materialVariants.materialId], references: [materials.id] }),
  params: many(materialVariantParams),
}));

export const handToolVariantParamsRelations = relations(handToolVariantParams, ({ one }) => ({
  variant: one(handToolVariants, {
    fields: [handToolVariantParams.variantId],
    references: [handToolVariants.id],
  }),
  paramValue: one(paramValues, {
    fields: [handToolVariantParams.paramValueId],
    references: [paramValues.id],
  }),
}));

export const materialVariantParamsRelations = relations(materialVariantParams, ({ one }) => ({
  variant: one(materialVariants, {
    fields: [materialVariantParams.variantId],
    references: [materialVariants.id],
  }),
  paramValue: one(paramValues, {
    fields: [materialVariantParams.paramValueId],
    references: [paramValues.id],
  }),
}));

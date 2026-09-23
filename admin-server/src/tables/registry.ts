import type { DbName } from '~/db/pools';

import type { RefSpec } from './refs';

/**
 * Таблица админки. Колонки не перечисляются: берутся из ответа Postgres, так что новая
 * колонка в миграции появляется здесь сама. Описывается только то, чего из схемы не
 * вывести, — куда ведут ссылки через границы баз и что скрыть.
 *
 * `select` — когда `SELECT *` не годится: скрыть хеш, развернуть enum-массив
 * (pg без знания OID отдаёт его строкой '{own,manage}'). ORDER BY и LIMIT
 * добавляет сервис, поэтому здесь их нет.
 */
export type TableDef = {
  key: string;
  db: DbName;
  group: string;
  title: string;
  from: string;
  select?: string;
  orderBy?: string;
  refs?: Record<string, RefSpec>;
  /** Форма добавления на клиенте (admin-client/src/forms). Пишет она через API сервиса, не сюда. */
  create?: 'material_variant' | 'hand_tool_variant';
};

const authored = { created_by: 'user' } as const;

// Связок сборок с параметрами (*_variant_params) здесь нет намеренно: их целиком показывает
// подпись кода у самих сборок — «материал · вид значение × …» (refs.ts → variantSql).
export const TABLES: TableDef[] = [
  {
    key: 'user.users',
    db: 'user',
    group: 'Пользователи',
    title: 'Пользователи',
    from: 'users',
    // Хеш пароля не нужен даже админу — как toPublicUser() в самом user-server.
    select: 'id, login, first_name, last_name, role, created_at, updated_at',
  },

  { key: 'company.companies', db: 'company', group: 'Компании', title: 'Компании', from: 'companies' },
  {
    key: 'company.members',
    db: 'company',
    group: 'Компании',
    title: 'Участники',
    from: 'company_members',
    select: 'company_id, user_id, roles::text[] AS roles, created_at, updated_at',
    orderBy: 'company_id, user_id',
    refs: { company_id: 'company', user_id: 'user' },
  },

  {
    key: 'warehouse.warehouses',
    db: 'warehouse',
    group: 'Склады',
    title: 'Склады и «руки»',
    from: 'warehouses',
    refs: { owner_id: 'user', company_id: 'company', holder_user_id: 'user' },
  },
  {
    key: 'warehouse.items',
    db: 'warehouse',
    group: 'Склады',
    title: 'Содержимое',
    from: 'warehouse_items',
    refs: {
      warehouse_id: 'warehouse',
      // Как в нормах расхода: сборка — кодом, электроинструмент — id позиции.
      ref: {
        by: 'kind',
        map: {
          material: 'material_variant_code',
          hand_tool: 'hand_tool_variant_code',
          power_tool: 'power_tool',
        },
      },
    },
  },
  {
    key: 'warehouse.users',
    db: 'warehouse',
    group: 'Склады',
    title: 'Назначения',
    from: 'warehouse_users',
    orderBy: 'warehouse_id, user_id',
    refs: { warehouse_id: 'warehouse', user_id: 'user' },
  },

  {
    key: 'order.zaiavki',
    db: 'order',
    group: 'Заявки',
    title: 'Заявки',
    from: 'zaiavki',
    // Ключ правки ничьей заявки — только признак: хеш ничего не скажет, а светить его незачем.
    select: `id, user_id, data->>'name' AS name, data->>'system' AS system,
             edit_key_hash IS NOT NULL AS has_edit_key, created_at, updated_at, data`,
    refs: { user_id: 'user' },
  },

  {
    key: 'dict.work_types',
    db: 'dictionary',
    group: 'Справочник: структура',
    title: 'Виды работ',
    from: 'work_types',
    refs: authored,
  },
  {
    key: 'dict.systems',
    db: 'dictionary',
    group: 'Справочник: структура',
    title: 'Технологии',
    from: 'systems',
    refs: { work_type_id: 'work_type', unit_id: 'unit', ...authored },
  },
  {
    key: 'dict.work_stages',
    db: 'dictionary',
    group: 'Справочник: структура',
    title: 'Этапы',
    from: 'work_stages',
    orderBy: 'system_id, position',
    refs: { system_id: 'system', ...authored },
  },

  {
    key: 'dict.materials',
    db: 'dictionary',
    group: 'Справочник: позиции',
    title: 'Материалы',
    from: 'materials',
    refs: { unit_id: 'unit', type_id: 'material_type', ...authored },
  },
  {
    key: 'dict.material_variants',
    db: 'dictionary',
    group: 'Справочник: позиции',
    title: 'Сборки материалов',
    from: 'material_variants',
    refs: { code: 'material_variant_code', material_id: 'material' },
    create: 'material_variant',
  },
  {
    key: 'dict.hand_tools',
    db: 'dictionary',
    group: 'Справочник: позиции',
    title: 'Ручной инструмент',
    from: 'hand_tools',
    refs: authored,
  },
  {
    key: 'dict.hand_tool_variants',
    db: 'dictionary',
    group: 'Справочник: позиции',
    title: 'Сборки ручного инструмента',
    from: 'hand_tool_variants',
    refs: { code: 'hand_tool_variant_code', hand_tool_id: 'hand_tool' },
    create: 'hand_tool_variant',
  },
  {
    key: 'dict.power_tools',
    db: 'dictionary',
    group: 'Справочник: позиции',
    title: 'Электроинструмент',
    from: 'power_tools',
    refs: authored,
  },

  {
    key: 'dict.material_types',
    db: 'dictionary',
    group: 'Справочник: параметры',
    title: 'Типы материалов',
    from: 'material_types',
  },
  { key: 'dict.units', db: 'dictionary', group: 'Справочник: параметры', title: 'Единицы', from: 'units' },
  {
    key: 'dict.param_kinds',
    db: 'dictionary',
    group: 'Справочник: параметры',
    title: 'Виды параметров',
    from: 'param_kinds',
  },
  {
    key: 'dict.param_values',
    db: 'dictionary',
    group: 'Справочник: параметры',
    title: 'Значения параметров',
    from: 'param_values',
    refs: { kind_id: 'param_kind', unit_id: 'unit' },
  },

  ...(['material', 'hand_tool'] as const).map((kind): TableDef => ({
    key: `calc.${kind}_norms`,
    db: 'calc',
    group: 'Нормы расхода',
    title: kind === 'material' ? 'Материалы' : 'Ручной инструмент',
    from: `${kind}_norms`,
    orderBy: `work_stage_id, id`,
    refs: {
      work_stage_id: 'work_stage',
      [`${kind}_variant_code`]: `${kind}_variant_code`,
      author_id: 'user',
    },
  })),
  {
    key: 'calc.power_tool_norms',
    db: 'calc',
    group: 'Нормы расхода',
    title: 'Электроинструмент',
    from: 'power_tool_norms',
    orderBy: 'work_stage_id, id',
    refs: { work_stage_id: 'work_stage', power_tool_id: 'power_tool', author_id: 'user' },
  },

  {
    key: 'dict.seed_history',
    db: 'dictionary',
    group: 'Служебное',
    title: 'Сиды словаря',
    from: 'seed_history',
    orderBy: 'applied_at',
  },
  {
    key: 'calc.schema_migrations',
    db: 'calc',
    group: 'Служебное',
    title: 'Миграции calc',
    from: 'schema_migrations',
  },
  ...(['user', 'order', 'dictionary', 'warehouse', 'company'] as const).map((db): TableDef => ({
    key: `${db}.drizzle_migrations`,
    db,
    group: 'Служебное',
    title: `Миграции ${db} (Drizzle)`,
    from: 'drizzle.__drizzle_migrations',
  })),
];

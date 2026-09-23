import type { DbName } from '~/db/pools';

/**
 * Во что превращается id (или код) из чужой колонки. Каждый запрос берёт массив ключей
 * $1 и отдаёт пары (key, label); ключ — всегда текст, чтобы id и коды сборок шли одной
 * дорогой. Чего в ответе нет — ссылка висячая, клиент показывает её красным.
 *
 * `int: true` — ключ числовой: нечисловые значения отбрасываются до запроса, иначе
 * `$1::int[]` уронил бы весь запрос из-за одного битого ref на складе.
 */
type RefSource = { db: DbName; int?: boolean; sql: string };

/**
 * «вид значение единица» по параметрам сборки. FILTER — чтобы у сборки без параметров
 * вышел NULL, а не пустая строка: concat_ws пропускает только NULL, и к названию
 * прилип бы висячий « · ».
 */
const PARAMS = `string_agg(
  concat_ws(' ', k.name_ru, trim_scale(pv.value)::text || ' ' || u.code), ' × ' ORDER BY pv.id
) FILTER (WHERE pv.id IS NOT NULL)`;

/** Сборка по коду — так на неё ссылаются нормы расхода и склад. */
const variantSql = (kind: 'material' | 'hand_tool') => {
  const owner = kind === 'material' ? 'materials' : 'hand_tools';
  const fk = kind === 'material' ? 'material_id' : 'hand_tool_id';
  return `
    SELECT v.code AS key,
           concat_ws(' · ', coalesce(o.name_ru, o.name_en), ${PARAMS}) AS label
    FROM ${kind}_variants v
    JOIN ${owner} o ON o.id = v.${fk}
    LEFT JOIN ${kind}_variant_params vp ON vp.variant_id = v.id
    LEFT JOIN param_values pv ON pv.id = vp.param_value_id
    LEFT JOIN param_kinds k ON k.id = pv.kind_id
    LEFT JOIN units u ON u.id = pv.unit_id
    WHERE v.code = ANY($1::text[])
    GROUP BY v.id, o.id`;
};

/** Название на любом заполненном языке — у технологий и позиций бывает только одно из двух. */
const named = (table: string, extra = '') => `
  SELECT id::text AS key, coalesce(name_ru, name_en${extra}) AS label
  FROM ${table} WHERE id = ANY($1::int[])`;

export const REFS = {
  user: {
    db: 'user',
    int: true,
    sql: `SELECT id::text AS key,
                 concat_ws(' ', first_name, last_name) || ' (' || login || ')' AS label
          FROM users WHERE id = ANY($1::int[])`,
  },
  company: {
    db: 'company',
    int: true,
    sql: `SELECT id::text AS key, name AS label FROM companies WHERE id = ANY($1::int[])`,
  },
  warehouse: {
    db: 'warehouse',
    int: true,
    // «Руки» подписаны отдельно: у них имя склада — просто кто выдал первым.
    sql: `SELECT id::text AS key,
                 CASE WHEN holder_user_id IS NULL THEN name ELSE 'на руках #' || holder_user_id END AS label
          FROM warehouses WHERE id = ANY($1::int[])`,
  },
  unit: {
    db: 'dictionary',
    int: true,
    sql: `SELECT id::text AS key, name_ru || ' (' || code || ')' AS label FROM units WHERE id = ANY($1::int[])`,
  },
  param_kind: { db: 'dictionary', int: true, sql: named('param_kinds') },
  param_value: {
    db: 'dictionary',
    int: true,
    sql: `SELECT pv.id::text AS key,
                 concat_ws(' ', k.name_ru, trim_scale(pv.value)::text || ' ' || u.code) AS label
          FROM param_values pv
          JOIN units u ON u.id = pv.unit_id
          LEFT JOIN param_kinds k ON k.id = pv.kind_id
          WHERE pv.id = ANY($1::int[])`,
  },
  work_type: { db: 'dictionary', int: true, sql: named('work_types') },
  material_type: { db: 'dictionary', int: true, sql: named('material_types') },
  system: { db: 'dictionary', int: true, sql: named('systems', ', title') },
  work_stage: {
    db: 'dictionary',
    int: true,
    // Этап сам по себе неузнаваем («Грунтование» есть у многих) — с технологией.
    sql: `SELECT st.id::text AS key,
                 coalesce(s.name_ru, s.name_en, s.title) || ' › ' || coalesce(st.name_ru, st.name_en, st.title) AS label
          FROM work_stages st JOIN systems s ON s.id = st.system_id
          WHERE st.id = ANY($1::int[])`,
  },
  material: { db: 'dictionary', int: true, sql: named('materials') },
  hand_tool: { db: 'dictionary', int: true, sql: named('hand_tools') },
  power_tool: { db: 'dictionary', int: true, sql: named('power_tools') },
  material_variant_code: { db: 'dictionary', sql: variantSql('material') },
  hand_tool_variant_code: { db: 'dictionary', sql: variantSql('hand_tool') },
} satisfies Record<string, RefSource>;

export type RefKind = keyof typeof REFS;

/** Колонка ссылается на одно или — как ref на складе — на разное, смотря по соседней колонке. */
export type RefSpec = RefKind | { by: string; map: Record<string, RefKind> };

export function refKindFor(spec: RefSpec, row: Record<string, unknown>): RefKind | undefined {
  return typeof spec === 'string' ? spec : spec.map[String(row[spec.by])];
}

export function refSource(kind: RefKind): RefSource {
  return REFS[kind];
}

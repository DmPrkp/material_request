/**
 * Заливка справочника.
 *
 * Данные лежат в src/db/seed-data/*.ts типизированными массивами, а не в SQL.
 * Смысл в одной вещи: `code` варианта здесь НЕ хранится — он собирается
 * функцией buildVariantCode(), той же самой, которой пользуется API. Пока код
 * вбивали руками в SQL, он успел разойтись с параметрами в трёх вариантах
 * из двухсот, и заметить это можно было только сплошной сверкой.
 *
 * id проставляются явно и намеренно: нормы расхода в calc-server ссылаются на
 * конкретные *_variant_id, и раздача новых id через identity их бы осиротила.
 * Поэтому после заливки sequence сдвигаются на max(id) — иначе первая же
 * вставка без id упала бы с duplicate key.
 *
 * Шаги именованные и отмечаются в seed_history поштучно: контейнер гоняет
 * db:seed при каждом старте, а том переживает рестарт — без отметок вторая
 * заливка падала бы на duplicate key. Правка уже применённого шага до базы
 * не доедет — а справочник с сентября 2026 в проде, где пересоздать базу нельзя:
 * данные правятся новым именованным шагом, как схема — новой миграцией.
 */
import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { buildVariantCode } from '~/modules/catalog/variant-code';
import { logError } from '../common/error-log';
import { databaseUrl } from './config';
import * as data from './seed-data';
import * as schema from './schema';

type Database = NodePgDatabase<typeof schema>;

type Step = {
  name: string;
  /** Сколько строк вставил шаг — видно в логе, что заливка не пустая. */
  run: (tx: Database) => Promise<number>;
};

const SEQUENCE_TABLES = [
  'units',
  'param_kinds',
  'param_values',
  'work_types',
  'systems',
  'work_stages',
  'hand_tools',
  'power_tools',
  'material_types',
  'materials',
  'hand_tool_variants',
  'material_variants',
];

/** Коды не должны совпадать: два варианта с одинаковым набором параметров — это дубль. */
function assertUniqueCodes(label: string, codes: string[]): void {
  const seen = new Set<string>();
  const duplicates = codes.filter((code) => (seen.has(code) ? true : (seen.add(code), false)));

  if (duplicates.length > 0) {
    throw new Error(`${label}: повторяющиеся коды вариантов — ${[...new Set(duplicates)].join(', ')}`);
  }
}

const handToolVariantRows = data.handToolVariants.map((v) => ({
  id: v.id,
  handToolId: v.handToolId,
  code: buildVariantCode(v.handToolId, v.paramValueIds),
}));

const materialVariantRows = data.materialVariants.map((v) => ({
  id: v.id,
  materialId: v.materialId,
  code: buildVariantCode(v.materialId, v.paramValueIds),
}));

const handToolLinks = data.handToolVariants.flatMap((v) =>
  v.paramValueIds.map((paramValueId) => ({ variantId: v.id, paramValueId })),
);
const materialLinks = data.materialVariants.flatMap((v) =>
  v.paramValueIds.map((paramValueId) => ({ variantId: v.id, paramValueId })),
);

// Перегородка С112 — отдельным шагом, чтобы доехать до уже залитой базы (см. c112.ts).
const c112MaterialVariantRows = data.c112MaterialVariants.map((v) => ({
  id: v.id,
  materialId: v.materialId,
  code: buildVariantCode(v.materialId, v.paramValueIds),
}));

const c112MaterialLinks = data.c112MaterialVariants.flatMap((v) =>
  v.paramValueIds.map((paramValueId) => ({ variantId: v.id, paramValueId })),
);

// Гибкая черепица — тем же порядком, своим шагом (см. shingles.ts).
const shinglesMaterialVariantRows = data.shinglesMaterialVariants.map((v) => ({
  id: v.id,
  materialId: v.materialId,
  code: buildVariantCode(v.materialId, v.paramValueIds),
}));

const shinglesMaterialLinks = data.shinglesMaterialVariants.flatMap((v) =>
  v.paramValueIds.map((paramValueId) => ({ variantId: v.id, paramValueId })),
);

// Газобетон — тем же порядком (см. aerated-concrete.ts); у ручного инструмента
// сборки без параметров, но код всё равно собирается той же функцией.
const aeratedMaterialVariantRows = data.aeratedMaterialVariants.map((v) => ({
  id: v.id,
  materialId: v.materialId,
  code: buildVariantCode(v.materialId, v.paramValueIds),
}));

const aeratedHandToolVariantRows = data.aeratedHandToolVariants.map((v) => ({
  id: v.id,
  handToolId: v.handToolId,
  code: buildVariantCode(v.handToolId, v.paramValueIds),
}));

const aeratedMaterialLinks = data.aeratedMaterialVariants.flatMap((v) =>
  v.paramValueIds.map((paramValueId) => ({ variantId: v.id, paramValueId })),
);

// Металлочерепица — тем же порядком (см. metal-tile.ts).
const metalTileMaterialVariantRows = data.metalTileMaterialVariants.map((v) => ({
  id: v.id,
  materialId: v.materialId,
  code: buildVariantCode(v.materialId, v.paramValueIds),
}));

const metalTileMaterialLinks = data.metalTileMaterialVariants.flatMap((v) =>
  v.paramValueIds.map((paramValueId) => ({ variantId: v.id, paramValueId })),
);

/** Вставка с подсчётом затронутых строк. */
async function insert(query: PromiseLike<{ rowCount: number | null }>): Promise<number> {
  const result = await query;
  return result.rowCount ?? 0;
}

const STEPS: Step[] = [
  { name: 'units', run: (tx) => insert(tx.insert(schema.units).values(data.units)) },
  { name: 'param-kinds', run: (tx) => insert(tx.insert(schema.paramKinds).values(data.paramKinds)) },
  {
    name: 'param-values',
    // numeric в pg ездит строкой
    run: (tx) =>
      insert(
        tx.insert(schema.paramValues).values(data.paramValues.map((p) => ({ ...p, value: String(p.value) }))),
      ),
  },
  // Виды работ идут до технологий: у технологии на них FK.
  { name: 'work-types', run: (tx) => insert(tx.insert(schema.workTypes).values(data.workTypes)) },
  { name: 'systems', run: (tx) => insert(tx.insert(schema.systems).values(data.systems)) },
  { name: 'work-stages', run: (tx) => insert(tx.insert(schema.workStages).values(data.workStages)) },
  { name: 'hand-tools', run: (tx) => insert(tx.insert(schema.handTools).values(data.handTools)) },
  { name: 'power-tools', run: (tx) => insert(tx.insert(schema.powerTools).values(data.powerTools)) },
  // Типы идут до материалов: у материала на них FK.
  { name: 'material-types', run: (tx) => insert(tx.insert(schema.materialTypes).values(data.materialTypes)) },
  { name: 'materials', run: (tx) => insert(tx.insert(schema.materials).values(data.materials)) },
  {
    name: 'hand-tool-variants',
    run: (tx) => insert(tx.insert(schema.handToolVariants).values(handToolVariantRows)),
  },
  {
    name: 'material-variants',
    run: (tx) => insert(tx.insert(schema.materialVariants).values(materialVariantRows)),
  },
  {
    name: 'hand-tool-variant-params',
    run: (tx) => insert(tx.insert(schema.handToolVariantParams).values(handToolLinks)),
  },
  {
    name: 'material-variant-params',
    run: (tx) => insert(tx.insert(schema.materialVariantParams).values(materialLinks)),
  },
  {
    // Весь С112 одним шагом: порядок вставки — по внешним ключам.
    name: 'c112',
    run: async (tx) => {
      let rows = 0;
      rows += await insert(
        tx
          .insert(schema.paramValues)
          .values(data.c112ParamValues.map((p) => ({ ...p, value: String(p.value) }))),
      );
      rows += await insert(tx.insert(schema.materialTypes).values(data.c112MaterialTypes));
      rows += await insert(tx.insert(schema.materials).values(data.c112Materials));
      rows += await insert(tx.insert(schema.systems).values(data.c112Systems));
      rows += await insert(tx.insert(schema.workStages).values(data.c112WorkStages));
      rows += await insert(tx.insert(schema.materialVariants).values(c112MaterialVariantRows));
      rows += await insert(tx.insert(schema.materialVariantParams).values(c112MaterialLinks));
      return rows;
    },
  },
  {
    // Гибкая черепица одним шагом: порядок вставки — по внешним ключам.
    name: 'shingles',
    run: async (tx) => {
      let rows = 0;
      rows += await insert(
        tx
          .insert(schema.paramValues)
          .values(data.shinglesParamValues.map((p) => ({ ...p, value: String(p.value) }))),
      );
      rows += await insert(tx.insert(schema.materialTypes).values(data.shinglesMaterialTypes));
      rows += await insert(tx.insert(schema.materials).values(data.shinglesMaterials));
      rows += await insert(tx.insert(schema.systems).values(data.shinglesSystems));
      rows += await insert(tx.insert(schema.workStages).values(data.shinglesWorkStages));
      rows += await insert(tx.insert(schema.materialVariants).values(shinglesMaterialVariantRows));
      rows += await insert(tx.insert(schema.materialVariantParams).values(shinglesMaterialLinks));
      return rows;
    },
  },
  {
    // Металлочерепица одним шагом: порядок вставки — по внешним ключам.
    name: 'metal-tile',
    run: async (tx) => {
      let rows = 0;
      rows += await insert(
        tx
          .insert(schema.paramValues)
          .values(data.metalTileParamValues.map((p) => ({ ...p, value: String(p.value) }))),
      );
      rows += await insert(tx.insert(schema.powerTools).values(data.metalTilePowerTools));
      rows += await insert(tx.insert(schema.materials).values(data.metalTileMaterials));
      rows += await insert(tx.insert(schema.systems).values(data.metalTileSystems));
      rows += await insert(tx.insert(schema.workStages).values(data.metalTileWorkStages));
      rows += await insert(tx.insert(schema.materialVariants).values(metalTileMaterialVariantRows));
      rows += await insert(tx.insert(schema.materialVariantParams).values(metalTileMaterialLinks));
      return rows;
    },
  },
  {
    // Весь газобетон одним шагом: порядок вставки — по внешним ключам.
    name: 'aerated-concrete',
    run: async (tx) => {
      let rows = 0;
      // Единица идёт первой: на неё ссылаются и материалы, и сама технология.
      rows += await insert(tx.insert(schema.units).values(data.aeratedUnits));
      rows += await insert(
        tx
          .insert(schema.paramValues)
          .values(data.aeratedParamValues.map((p) => ({ ...p, value: String(p.value) }))),
      );
      rows += await insert(tx.insert(schema.materialTypes).values(data.aeratedMaterialTypes));
      rows += await insert(tx.insert(schema.handTools).values(data.aeratedHandTools));
      rows += await insert(tx.insert(schema.handToolVariants).values(aeratedHandToolVariantRows));
      rows += await insert(tx.insert(schema.materials).values(data.aeratedMaterials));
      rows += await insert(tx.insert(schema.systems).values(data.aeratedSystems));
      rows += await insert(tx.insert(schema.workStages).values(data.aeratedWorkStages));
      rows += await insert(tx.insert(schema.materialVariants).values(aeratedMaterialVariantRows));
      rows += await insert(tx.insert(schema.materialVariantParams).values(aeratedMaterialLinks));
      return rows;
    },
  },
  {
    /*
     * Кровли завели кодами SHINGLES и METAL_TILE, а код технологии пишется строчными
     * (frame_scaffold, flat); заглавные — только у сокращений вроде EIFS и GKL_C112.
     * Правка в seed-data доезжает лишь до пустой базы, поэтому уже залитым — свой шаг.
     * Код виден в адресе калькулятора и служит ключом снимка на клиенте
     * (constants/systems), так что переименование меняет и то, и другое.
     */
    name: 'system-titles-lowercase',
    run: async (tx) => {
      let rows = 0;
      for (const [from, to] of [
        ['SHINGLES', 'shingles'],
        ['METAL_TILE', 'metal_tile'],
      ]) {
        rows += await insert(
          tx.update(schema.systems).set({ title: to }).where(eq(schema.systems.title, from)),
        );
      }
      return rows;
    },
  },
];

async function main(): Promise<void> {
  assertUniqueCodes(
    'ручной инструмент',
    [...handToolVariantRows, ...aeratedHandToolVariantRows].map((v) => v.code),
  );
  assertUniqueCodes(
    'материалы',
    [
      ...materialVariantRows,
      ...c112MaterialVariantRows,
      ...shinglesMaterialVariantRows,
      ...metalTileMaterialVariantRows,
      ...aeratedMaterialVariantRows,
    ].map((v) => v.code),
  );

  const pool = new Pool({ connectionString: databaseUrl(), max: 1 });
  const db = drizzle(pool, { schema, casing: 'snake_case' });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seed_history (
        filename    TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    let applied = 0;

    for (const step of STEPS) {
      const done = await db
        .select()
        .from(schema.seedHistory)
        .where(eq(schema.seedHistory.filename, step.name));

      if (done.length > 0) continue;

      // Шаг и отметка о нём — одной транзакцией: либо оба, либо ничего.
      await db.transaction(async (tx) => {
        const rows = await step.run(tx);
        await tx.insert(schema.seedHistory).values({ filename: step.name });
        console.log(`✓ ${step.name}: ${rows}`);
      });

      applied++;
    }

    if (applied === 0) {
      console.log('Справочник уже залит.');
      return;
    }

    for (const table of SEQUENCE_TABLES) {
      await pool.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1,
          false
        );
      `);
    }
    console.log('Sequence сдвинуты.');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  logError('seed', error);
  process.exit(1);
});

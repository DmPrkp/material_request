import { describe, expect, it, vi } from 'vitest';

import type { DbName, DbPools } from '~/db/pools';

import { REFS } from './refs';
import { TABLES } from './registry';
import { LABELS, TablesService } from './tables.service';

/** Отвечает по базе: основной запрос таблицы — строками, запросы подписей — по ключам из $1. */
function service(tableRows: Record<string, unknown>[], labels: Record<string, Record<string, string>>) {
  const query = vi.fn((db: DbName, sql: string, params: unknown[] = []) => {
    if (sql.startsWith('SELECT') && !params.length) {
      const fields = Object.keys(tableRows[0] ?? {}).map((name) => ({ name, dataTypeID: 25 }));
      return Promise.resolve({ rows: tableRows.map((row) => ({ ...row })), fields });
    }
    const source = Object.values(REFS).find((ref) => ref.sql === sql && ref.db === db);
    const kind = Object.keys(REFS).find((k) => REFS[k as keyof typeof REFS] === source)!;
    const keys = params[0] as string[];
    return Promise.resolve({
      rows: keys.filter((key) => labels[kind]?.[key]).map((key) => ({ key, label: labels[kind][key] })),
    });
  });
  return { query, service: new TablesService({ query } as unknown as DbPools) };
}

describe('TablesService.rows', () => {
  it('подписывает ссылки из чужих баз одним запросом на вид, висячие — null', async () => {
    const { query, service: tables } = service(
      [
        { id: 1, owner_id: 7, company_id: 3, holder_user_id: null },
        { id: 2, owner_id: 7, company_id: 99, holder_user_id: 8 },
      ],
      { user: { '7': 'Иван (ivan)', '8': 'Пётр (petr)' }, company: { '3': 'Стройка' } },
    );

    const result = await tables.rows('warehouse.warehouses');

    expect(result.rows[0][LABELS]).toEqual({ owner_id: 'Иван (ivan)', company_id: 'Стройка' });
    expect(result.rows[1][LABELS]).toEqual({
      owner_id: 'Иван (ivan)',
      company_id: null,
      holder_user_id: 'Пётр (petr)',
    });
    // owner_id и holder_user_id — оба пользователи: один запрос в базу user на оба столбца.
    expect(query.mock.calls.filter(([db]) => db === 'user')).toHaveLength(1);
    expect(result.columns.find((c) => c.field === 'owner_id')).toMatchObject({ ref: true });
  });

  it('ref на складе ведёт туда, куда велит kind, а нечисловой id не роняет запрос', async () => {
    const { query, service: tables } = service(
      [
        { id: 1, warehouse_id: 1, kind: 'material', ref: '8:207' },
        { id: 2, warehouse_id: 1, kind: 'power_tool', ref: '12' },
        { id: 3, warehouse_id: 1, kind: 'power_tool', ref: 'мусор' },
      ],
      {
        material_variant_code: { '8:207': 'Дюбель · 8 mm' },
        power_tool: { '12': 'Перфоратор' },
        warehouse: { '1': 'Основной' },
      },
    );

    const { rows } = await tables.rows('warehouse.items');

    expect(rows.map((row) => (row[LABELS] as Record<string, unknown>).ref)).toEqual([
      'Дюбель · 8 mm',
      'Перфоратор',
      null,
    ]);
    const powerCall = query.mock.calls.find(([, sql]) => sql === REFS.power_tool.sql)!;
    expect(powerCall[2]).toEqual([['12']]);
  });

  it('у каждой таблицы реестра уникальный ключ, а ссылки — на известные виды', () => {
    expect(new Set(TABLES.map((t) => t.key)).size).toBe(TABLES.length);
    for (const table of TABLES) {
      for (const spec of Object.values(table.refs ?? {})) {
        const kinds = typeof spec === 'string' ? [spec] : Object.values(spec.map);
        for (const kind of kinds) expect(REFS).toHaveProperty(kind);
      }
    }
  });
});

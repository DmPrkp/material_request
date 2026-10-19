import { describe, expect, it, vi } from 'vitest';

import type { ServiceClient } from './service-client';

import { summarizeZayavki, TOOLS, toolDefinitions } from './tools';

describe('tools', () => {
  it('имена уникальны, а JSON-схемы строятся', () => {
    expect(new Set(TOOLS.map((t) => t.name)).size).toBe(TOOLS.length);
    expect(toolDefinitions().every((d) => d.function.parameters.type === 'object')).toBe(true);
  });

  it('изменяющие инструменты помечены write', () => {
    const writes = TOOLS.filter((t) => t.write).map((t) => t.name);
    expect([...writes].sort()).toEqual(['create_zayavka', 'delete_zayavka', 'update_zayavka']);
  });
});

describe('summarizeZayavki', () => {
  it('оставляет шапку и выбрасывает состав', () => {
    const body = [
      {
        id: 1,
        data: JSON.stringify({ system: 'EIFS', materials: [{}, {}], hand_tools: [{}] }),
        updatedAt: 'x',
      },
    ];
    expect(summarizeZayavki(body)).toEqual([
      {
        id: 1,
        system: 'EIFS',
        name: undefined,
        stages: 2,
        handTools: 1,
        powerTools: undefined,
        createdAt: undefined,
        updatedAt: 'x',
      },
    ]);
  });
});

describe('find_in_stock', () => {
  it('ищет по названию на всех складах', async () => {
    const tool = TOOLS.find((t) => t.name === 'find_in_stock')!;
    const request = vi.fn((_u, _s, _m, path: string) => {
      if (path.startsWith('/warehouses?'))
        return Promise.resolve({
          ok: true,
          status: 200,
          body: {
            items: [
              { id: 1, name: 'Гараж' },
              { id: 2, name: 'Офис' },
            ],
          },
        });
      if (path.startsWith('/warehouses/1/'))
        return Promise.resolve({
          ok: true,
          status: 200,
          body: [{ kind: 'power_tool', ref: '16', quantity: 2 }],
        });
      if (path.startsWith('/warehouses/2/')) return Promise.resolve({ ok: true, status: 200, body: [] });
      return Promise.resolve({
        ok: true,
        status: 200,
        body: { items: [{ id: 16, name: 'Перфоратор SDS+' }] },
      });
    });

    const res = await tool.run(
      { request } as unknown as ServiceClient,
      { id: 1, role: 'USER' },
      { q: 'перфоратор' },
    );

    expect(res.body).toEqual([
      {
        warehouseId: 1,
        warehouse: 'Гараж',
        kind: 'power_tool',
        name: 'Перфоратор SDS+',
        params: undefined,
        quantity: 2,
      },
    ]);
  });
});

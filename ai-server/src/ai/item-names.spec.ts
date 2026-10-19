import { describe, expect, it, vi } from 'vitest';

import { withItemNames } from './item-names';
import type { ServiceClient } from './service-client';

const user = { id: 1, role: 'USER' as const };

describe('withItemNames', () => {
  it('подставляет названия по kind и ref', async () => {
    const request = vi.fn((_u, _s, _m, path: string) => {
      if (path.startsWith('/power-tools'))
        return Promise.resolve({
          ok: true,
          status: 200,
          body: { items: [{ id: 16, name: 'перфоратор SDS+' }] },
        });
      return Promise.resolve({
        ok: true,
        status: 200,
        body: [
          {
            code: '8:208',
            owner: { name: 'Дюбель' },
            params: [{ kind: 'diameter', value: '10.0000', unit: 'mm' }],
          },
        ],
      });
    });
    const items = [
      { id: 1, kind: 'power_tool', ref: '16', quantity: 1 },
      { id: 2, kind: 'material', ref: '8:208', quantity: 5 },
      { id: 3, kind: 'material', ref: '99', quantity: 1 },
    ];

    const res = await withItemNames({ request } as unknown as ServiceClient, user, {
      ok: true,
      status: 200,
      body: items,
    });

    expect(res.body).toEqual([
      { id: 1, kind: 'power_tool', ref: '16', quantity: 1, name: 'перфоратор SDS+' },
      { id: 2, kind: 'material', ref: '8:208', quantity: 5, name: 'Дюбель', params: 'diameter 10 mm' },
      { id: 3, kind: 'material', ref: '99', quantity: 1 },
    ]);
  });

  it('сбой справочника не ломает ответ', async () => {
    const request = vi.fn().mockRejectedValue(new Error('нет сети'));
    const body = [{ kind: 'power_tool', ref: '16' }];

    const res = await withItemNames({ request } as unknown as ServiceClient, user, {
      ok: true,
      status: 200,
      body,
    });

    expect(res.body).toEqual(body);
  });
});

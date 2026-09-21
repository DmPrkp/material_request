import { BadGatewayException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { canAssign, canManage, canUnassign, canView, managesCompany, type WarehouseActor } from './access';
import { CompanyClient } from './company.client';
import { addItemsSchema } from './items.dto';
import { toView } from './items.service';
import { createWarehouseSchema, updateWarehouseSchema, warehouseQuerySchema } from './warehouses.dto';
import { withCounts } from './warehouses.service';

const user = { id: 7, role: 'USER' as const };
const admin = { id: 1, role: 'ADMIN' as const };

const actor = (patch: Partial<WarehouseActor> = {}): WarehouseActor => ({
  user,
  isOwner: false,
  isAssigned: false,
  companyRoles: [],
  ...patch,
});
const creator = actor({ isOwner: true });
const assigned = actor({ isAssigned: true, companyRoles: ['store'] });
const companyManager = actor({ companyRoles: ['manage'] });
const companyOwner = actor({ companyRoles: ['own'] });
const companyStorekeeper = actor({ companyRoles: ['store', 'review'] });
const stranger = actor();
const adminActor = actor({ user: admin });

describe('права на склад', () => {
  it('видят создатель, назначенный, own/manage компании и админ', () => {
    expect([creator, assigned, companyManager, companyOwner, adminActor].every(canView)).toBe(true);
  });

  it('рядовой участник компании и чужой склад не видят', () => {
    expect(canView(companyStorekeeper)).toBe(false);
    expect(canView(stranger)).toBe(false);
  });

  it('правят склад создатель, own/manage компании и админ, назначенный — нет', () => {
    expect([creator, companyManager, companyOwner, adminActor].every(canManage)).toBe(true);
    expect(canManage(assigned)).toBe(false);
  });

  it('назначают только own/manage компании и админ — создатель сам по себе нет', () => {
    expect([companyManager, companyOwner, adminActor].every(canAssign)).toBe(true);
    expect(canAssign(creator)).toBe(false);
    expect(canAssign(assigned)).toBe(false);
  });

  it('назначенный снимает только себя', () => {
    expect(canUnassign(assigned, 7)).toBe(true);
    expect(canUnassign(assigned, 8)).toBe(false);
    expect(canUnassign(companyManager, 8)).toBe(true);
  });

  it('управляет компанией own или manage', () => {
    expect(managesCompany(user, ['own'])).toBe(true);
    expect(managesCompany(user, ['manage', 'store'])).toBe(true);
    expect(managesCompany(user, ['review', 'store'])).toBe(false);
    expect(managesCompany(admin, [])).toBe(true);
  });
});

describe('CompanyClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it('спрашивает роли от имени пользователя заголовками X-User-*', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ id: 3, roles: ['manage'] }));
    vi.stubGlobal('fetch', fetch);

    await expect(new CompanyClient().rolesOf(3, user)).resolves.toEqual(['manage']);
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/companies\/3$/), {
      headers: { 'X-User-Id': '7', 'X-User-Role': 'USER' },
    });
  });

  it('чужая или удалённая компания (404) — ролей нет', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 404)));
    await expect(new CompanyClient().rolesOf(3, user)).resolves.toEqual([]);
  });

  it('участника ищет в составе компании', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(json([{ userId: 7, roles: ['own'] }, { userId: 9, roles: ['store'] }]))));
    await expect(new CompanyClient().isMember(3, 9, user)).resolves.toBe(true);
    await expect(new CompanyClient().isMember(3, 10, user)).resolves.toBe(false);
  });

  it('сервис компаний лежит — 502, а не 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(new CompanyClient().rolesOf(3, user)).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('фильтр списка', () => {
  it('?companyId — положительное целое', () => {
    expect(warehouseQuerySchema.parse({ companyId: '3' })).toMatchObject({ companyId: 3, state: 'active' });
    expect(warehouseQuerySchema.safeParse({ companyId: '0' }).success).toBe(false);
  });
});

describe('схемы склада', () => {
  it('название обязательно и обрезается', () => {
    expect(createWarehouseSchema.safeParse({}).success).toBe(false);
    expect(createWarehouseSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(createWarehouseSchema.parse({ name: '  Основной ' })).toEqual({ name: 'Основной' });
  });

  it('владельца из тела не принимает — 400, а не молчаливая подмена', () => {
    expect(createWarehouseSchema.safeParse({ name: 'Основной', ownerId: 8 }).success).toBe(false);
    expect(updateWarehouseSchema.safeParse({ ownerId: 8 }).success).toBe(false);
  });

  it('пустая строка в необязательном поле стирает его — null, а не ""', () => {
    expect(updateWarehouseSchema.parse({ address: ' ' })).toEqual({ address: null });
    expect(updateWarehouseSchema.parse({ description: null })).toEqual({ description: null });
  });

  it('компания — положительное целое, null делает склад личным', () => {
    expect(createWarehouseSchema.parse({ name: 'Основной', companyId: 3 })).toMatchObject({ companyId: 3 });
    expect(updateWarehouseSchema.parse({ companyId: null })).toEqual({ companyId: null });
    expect(createWarehouseSchema.safeParse({ name: 'Основной', companyId: 0 }).success).toBe(false);
  });

  it('правка может не трогать ничего', () => {
    expect(updateWarehouseSchema.parse({})).toEqual({});
  });
});

describe('схемы содержимого склада', () => {
  it('принимает пачку позиций с дробным количеством', () => {
    expect(
      addItemsSchema.parse({
        items: [
          { kind: 'material', ref: '7:227', quantity: 12.5 },
          { kind: 'power_tool', ref: '3', quantity: 1 },
        ],
      }).items,
    ).toHaveLength(2);
  });

  it('пустая пачка, ноль и отрицательное количество — отказ', () => {
    expect(addItemsSchema.safeParse({ items: [] }).success).toBe(false);
    expect(addItemsSchema.safeParse({ items: [{ kind: 'material', ref: '7:227', quantity: 0 }] }).success).toBe(
      false,
    );
    expect(addItemsSchema.safeParse({ items: [{ kind: 'material', ref: '7:227', quantity: -1 }] }).success).toBe(
      false,
    );
  });

  it('незнакомый вид позиции и лишние поля — отказ', () => {
    expect(addItemsSchema.safeParse({ items: [{ kind: 'screw', ref: '7', quantity: 1 }] }).success).toBe(false);
    expect(
      addItemsSchema.safeParse({ items: [{ kind: 'material', ref: '7:227', quantity: 1, title: 'Клей' }] })
        .success,
    ).toBe(false);
  });

  it('количество numeric из базы уходит наружу числом', () => {
    const row = {
      id: 5,
      warehouseId: 2,
      kind: 'material' as const,
      ref: '7:227',
      quantity: '12.5000',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    expect(toView(row)).toMatchObject({ quantity: 12.5, ref: '7:227' });
  });
});

describe('счётчики содержимого', () => {
  const warehouse = (id: number) => ({ id, name: `склад ${id}` }) as never;

  it('раскладывает счётчики по складам и видам', () => {
    const [first, second] = withCounts(
      [warehouse(1), warehouse(2)],
      [
        { warehouseId: 1, kind: 'material', value: 13 },
        { warehouseId: 1, kind: 'power_tool', value: 23 },
        { warehouseId: 2, kind: 'hand_tool', value: 5 },
      ],
    );

    expect(first.counts).toEqual({ material: 13, hand_tool: 0, power_tool: 23 });
    expect(second.counts).toEqual({ material: 0, hand_tool: 5, power_tool: 0 });
  });

  it('пустой склад получает нули, а не пропуски: клиенту не надо их дорисовывать', () => {
    const [only] = withCounts([warehouse(1)], []);
    expect(only.counts).toEqual({ material: 0, hand_tool: 0, power_tool: 0 });
  });
});

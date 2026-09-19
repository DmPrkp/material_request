import { describe, expect, it } from 'vitest';

import { createWarehouseSchema, updateWarehouseSchema } from './warehouses.dto';
import { canAccess } from './warehouses.service';

const user = { id: 7, role: 'USER' as const };
const admin = { id: 1, role: 'ADMIN' as const };

describe('canAccess', () => {
  it('свой склад — владельцу', () => {
    expect(canAccess({ ownerId: 7 }, user)).toBe(true);
  });

  it('чужой — нет', () => {
    expect(canAccess({ ownerId: 8 }, user)).toBe(false);
  });

  it('админу — любой', () => {
    expect(canAccess({ ownerId: 8 }, admin)).toBe(true);
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

  it('правка может не трогать ничего', () => {
    expect(updateWarehouseSchema.parse({})).toEqual({});
  });
});

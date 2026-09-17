import { describe, expect, it } from 'vitest';

import { variantLookupQuerySchema } from './catalog.dto';

describe('поиск сборок: ids или codes', () => {
  it('id разбираются в числа, коды остаются строками', () => {
    expect(variantLookupQuerySchema.parse({ ids: '80,89' })).toEqual({ ids: [80, 89], codes: undefined });
    expect(variantLookupQuerySchema.parse({ codes: '8:208:243,6' })).toEqual({
      ids: undefined,
      codes: ['8:208:243', '6'],
    });
  });

  it('повторы схлопываются: 200 — предел разных ссылок, а не длины строки', () => {
    expect(variantLookupQuerySchema.parse({ ids: '80,80,89' }).ids).toEqual([80, 89]);
    expect(variantLookupQuerySchema.parse({ codes: '6,6,8:208:243' }).codes).toEqual(['6', '8:208:243']);
  });

  it('сборка без параметров — код вырождается в id позиции', () => {
    expect(variantLookupQuerySchema.parse({ codes: '6' }).codes).toEqual(['6']);
  });

  it.each([
    ['пусто', {}],
    ['оба параметра разом', { ids: '80', codes: '6' }],
    ['код с мусором', { codes: '8:abc' }],
    ['код с хвостовым двоеточием', { codes: '8:' }],
    ['код вместо id', { ids: '8:208:243' }],
    ['пустая строка кодов', { codes: '' }],
    ['больше 200 id', { ids: Array.from({ length: 201 }, (_, i) => i + 1).join(',') }],
    ['больше 200 кодов', { codes: Array.from({ length: 201 }, (_, i) => `${i + 1}:1`).join(',') }],
  ])('400: %s', (_name, query) => {
    expect(() => variantLookupQuerySchema.parse(query)).toThrow();
  });
});

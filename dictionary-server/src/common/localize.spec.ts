import { describe, expect, it } from 'vitest';

import { localize, resolveLocale } from './localize';

const drill = {
  id: 13,
  nameRu: 'Бур по бетону SDS+',
  nameEn: 'Concrete Drill Bit SDS+',
  descriptionRu: 'Специальное сверло для бетона',
  descriptionEn: 'Specialized drill bit for concrete',
  isActive: true,
  unit: { id: 8, code: 'pcs', nameRu: 'штука', nameEn: 'piece' },
  type: { id: 10, code: 'tooling', nameRu: 'Оснастка', nameEn: 'Tooling' },
  variantsCount: 49,
};

describe('localize', () => {
  it('ru: одно имя и описание, вложенные единица и тип тоже свёрнуты', () => {
    expect(localize(drill, 'ru')).toEqual({
      id: 13,
      name: 'Бур по бетону SDS+',
      description: 'Специальное сверло для бетона',
      isActive: true,
      unit: { id: 8, code: 'pcs', name: 'штука' },
      type: { id: 10, code: 'tooling', name: 'Оснастка' },
      variantsCount: 49,
    });
  });

  it('en: английские значения', () => {
    const result = localize(drill, 'en') as Record<string, any>;
    expect(result.name).toBe('Concrete Drill Bit SDS+');
    expect(result.unit.name).toBe('piece');
    expect(result).not.toHaveProperty('nameEn');
  });

  it('нет перевода — русское значение', () => {
    const result = localize({ ...drill, descriptionEn: null, nameEn: '' }, 'en') as Record<string, any>;
    expect(result.name).toBe('Бур по бетону SDS+');
    expect(result.description).toBe('Специальное сверло для бетона');
  });

  it('заведено только по-английски — под ru отдаём английское, а не пустоту', () => {
    const stage = { id: 1, nameRu: null, nameEn: 'Priming' };
    expect(localize(stage, 'ru')).toEqual({ id: 1, name: 'Priming' });
    expect(localize({ ...stage, nameRu: '' }, 'ru')).toEqual({ id: 1, name: 'Priming' });
  });

  it('не заполнено ни на одном языке — null', () => {
    expect(localize({ descriptionRu: null, descriptionEn: '' }, 'en')).toEqual({ description: null });
  });

  it('страница списка: сворачивает items, служебные поля не трогает', () => {
    const page = { items: [drill], total: 1, page: 1, limit: 50, pages: 1 };
    const result = localize(page, 'ru') as Record<string, any>;
    expect(result.items[0].name).toBe('Бур по бетону SDS+');
    expect(result.total).toBe(1);
  });

  it('поле без пары на другом языке и Date остаются как есть', () => {
    const createdAt = new Date('2026-01-01');
    expect(localize({ titleRu: 'x', createdAt }, 'en')).toEqual({ titleRu: 'x', createdAt });
  });
});

describe('resolveLocale', () => {
  it.each([
    ['ru', 'ru'],
    ['en', 'en'],
    ['en-US,en;q=0.9', 'en'],
    ['de-DE,en;q=0.8', 'en'],
    ['de', 'ru'],
    ['', 'ru'],
    [undefined, 'ru'],
  ])('%s -> %s', (header, expected) => {
    expect(resolveLocale(header)).toBe(expected);
  });
});

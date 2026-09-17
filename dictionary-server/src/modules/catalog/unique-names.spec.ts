import { describe, expect, it } from 'vitest';

import { copyCandidate, pickNames } from './unique-names';

describe('copyCandidate', () => {
  it('первая копия — с пометкой, следующие — с номером', () => {
    expect(copyCandidate('шпатель', 'nameRu', 1, 100)).toBe('шпатель (копия)');
    expect(copyCandidate('шпатель', 'nameRu', 2, 100)).toBe('шпатель (копия 2)');
    expect(copyCandidate('spatula', 'nameEn', 1, 100)).toBe('spatula (copy)');
  });

  it('длинное имя обрезается так, чтобы пометка влезла в колонку', () => {
    const candidate = copyCandidate('ш'.repeat(100), 'nameRu', 1, 100);
    expect(candidate).toHaveLength(100);
    expect(candidate.endsWith(' (копия)')).toBe(true);
  });
});

describe('pickNames', () => {
  it('берёт только непустые названия, без пробелов по краям', () => {
    expect(pickNames({ nameRu: ' шпатель ', nameEn: '', unitId: 1 })).toEqual({ nameRu: 'шпатель' });
    expect(pickNames({ nameEn: null })).toEqual({});
  });
});

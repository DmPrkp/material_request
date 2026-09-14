import { describe, expect, it } from 'vitest';

import { generateCode } from './code';

describe('generateCode', () => {
  it('читаемая часть из английского названия плюс случайный хвост', () => {
    expect(generateCode('Primer coat')).toMatch(/^primer_coat_[0-9a-f]{6}$/);
  });

  it('два одинаковых названия дают разные коды — UNIQUE на title не мешает', () => {
    expect(generateCode('Primer')).not.toBe(generateCode('Primer'));
  });

  it('без английского названия или с кириллицей — нейтральный код', () => {
    expect(generateCode(undefined)).toMatch(/^item_[0-9a-f]{6}$/);
    expect(generateCode('Грунтование')).toMatch(/^item_[0-9a-f]{6}$/);
  });

  it('влезает в varchar(50)', () => {
    const code = generateCode('a very long english name '.repeat(5));
    expect(code.length).toBeLessThanOrEqual(50);
    expect(code).not.toMatch(/__/);
  });
});

import { describe, expect, it } from 'vitest';

import {
  createSystemSchema,
  createWorkStageSchema,
  createWorkTypeSchema,
  updateWorkStageSchema,
} from './structure.dto';

describe('схемы структуры', () => {
  it('createdBy из тела запроса отбрасывается — его ставит только контроллер из токена', () => {
    expect(
      createSystemSchema.parse({ nameRu: 'Мокрый фасад', workTypeId: 1, unitId: 7, createdBy: 999 }),
    ).not.toHaveProperty('createdBy');
    expect(createWorkStageSchema.parse({ nameRu: 'Грунт', systemId: 1, createdBy: 999 })).not.toHaveProperty(
      'createdBy',
    );
    expect(updateWorkStageSchema.parse({ createdBy: 999 })).not.toHaveProperty('createdBy');
  });

  it('название — на любом одном языке; описания и код необязательны', () => {
    expect(createSystemSchema.safeParse({ nameRu: 'Мокрый фасад', workTypeId: 1, unitId: 7 }).success).toBe(true);
    expect(createSystemSchema.safeParse({ nameEn: 'EIFS', workTypeId: 1, unitId: 7 }).success).toBe(true);
    expect(createWorkStageSchema.safeParse({ nameEn: 'Priming', systemId: 1, nameRu: null }).success).toBe(true);
  });

  it('без названия ни на одном языке не создаётся', () => {
    expect(createSystemSchema.safeParse({ workTypeId: 1, unitId: 7 }).success).toBe(false);
    expect(createSystemSchema.safeParse({ nameRu: '  ', nameEn: '', workTypeId: 1, unitId: 7 }).success).toBe(false);
    expect(createWorkStageSchema.safeParse({ systemId: 1 }).success).toBe(false);
  });

  it('правка может трогать один язык — остальное держит CHECK в базе', () => {
    expect(updateWorkStageSchema.safeParse({ nameEn: 'Priming' }).success).toBe(true);
    expect(updateWorkStageSchema.safeParse({ nameRu: null }).success).toBe(true);
  });

  it('позиция этапа необязательна, но если есть — целое от 1', () => {
    const stage = { nameRu: 'Грунт', systemId: 1 };
    expect(createWorkStageSchema.safeParse({ ...stage, position: 0 }).success).toBe(false);
    expect(createWorkStageSchema.safeParse({ ...stage, position: 1.5 }).success).toBe(false);
  });

  it('пробелы по краям срезаются', () => {
    expect(createSystemSchema.parse({ nameRu: '  Мокрый фасад  ', workTypeId: 1, unitId: 7 }).nameRu).toBe('Мокрый фасад');
  });

  it('технология без вида работ не создаётся', () => {
    expect(createSystemSchema.safeParse({ nameRu: 'Мокрый фасад' }).success).toBe(false);
    // Без единицы калькулятор не подпишет поля объёма — технологию не принимаем.
    expect(createSystemSchema.safeParse({ nameRu: 'Мокрый фасад', workTypeId: 1 }).success).toBe(false);
  });

  it('code вида работ годится в адрес: латиница в нижнем регистре, цифры и _', () => {
    const base = { nameRu: 'Фасад', nameEn: 'Facade' };
    expect(createWorkTypeSchema.safeParse({ ...base, code: 'facade' }).success).toBe(true);
    expect(createWorkTypeSchema.safeParse({ ...base, code: 'Facade' }).success).toBe(false);
    expect(createWorkTypeSchema.safeParse({ ...base, code: 'фасад' }).success).toBe(false);
    expect(createWorkTypeSchema.safeParse({ ...base, code: 'a/b' }).success).toBe(false);
  });
});

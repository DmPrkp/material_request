import { z } from 'zod';

/**
 * Двуязычные поля с клиента: форма пишет только язык страницы, остальные остаются
 * пустыми — наружу уйдёт ближайшее заполненное (common/localize.ts).
 *
 * Хоть одно название обязательно при создании. В правке refine не вешаем — она
 * трогает один язык, а стереть последнее название не даст CHECK *_name_present в базе.
 */
export const optionalText = (max: number) => z.string().trim().max(max).nullish();

export const hasName = (data: { nameRu?: string | null; nameEn?: string | null }) =>
  Boolean(data.nameRu || data.nameEn);

export const nameRequired = { message: 'Нужно название хотя бы на одном языке', path: ['nameRu'] };

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Разрешение ссылок из чужой базы: нормы расхода в calc-server ссылаются на этапы,
 * сборки и электроинструмент, и расчёт добирает их здесь пачкой.
 *
 * Это не список: видимость не проверяется, архивные отдаются, чего нет — того просто
 * нет в ответе. Правило — «фильтруем перечисление, не фильтруем разрешение ссылки»
 * (CLAUDE.md): ответ одинаков для всех, и расчёту не нужен токен.
 */

/** Больше страницы словаря разом не просят. */
export const MAX_LOOKUP = 200;

/** '1,2,3' — id через запятую; повторы схлопываются, предел — на разные ссылки. */
export const idListSchema = z
  .string()
  .regex(/^\d+(,\d+)*$/, 'ids — id через запятую')
  .transform((value) => [...new Set(value.split(',').map(Number))])
  .refine((ids) => ids.length <= MAX_LOOKUP, `Не больше ${MAX_LOOKUP} id за раз`);

export const idLookupQuerySchema = z.object({ ids: idListSchema });
export class IdLookupQueryDto extends createZodDto(idLookupQuerySchema) {}

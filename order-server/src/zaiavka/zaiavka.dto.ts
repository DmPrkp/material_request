import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { MAX_LOOKUP_IDS } from './limits';

/**
 * Тело заявки — любой JSON-объект: состав собирает клиент, сервис его только хранит
 * (src/types — что там обычно лежит, для выгрузки). Строгую схему не вводим, чтобы
 * новое поле расчёта не требовало правки здесь. Не объект (массив, строка) — 400.
 */
export const zaiavkaBodySchema = z.record(z.string(), z.unknown());

export const claimSchema = z.strictObject({
  items: z
    .array(z.object({ id: z.number().int().positive(), key: z.string().min(1) }))
    .max(MAX_LOOKUP_IDS, `не больше ${MAX_LOOKUP_IDS} заявок`),
});

export class ZaiavkaBodyDto extends createZodDto(zaiavkaBodySchema) {}
export class ClaimDto extends createZodDto(claimSchema) {}

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { WAREHOUSE_ITEM_KINDS } from '~/db/schema';

/**
 * Позиция склада: материал и ручной инструмент — код сборки («7:227», uniqKey в
 * заявке), электроинструмент — id позиции строкой. Количество — сколько добавить.
 */
const itemSchema = z.strictObject({
  kind: z.enum(WAREHOUSE_ITEM_KINDS),
  ref: z.string().trim().min(1).max(64),
  // Не целое: материалы меряются мешками, литрами и квадратами.
  quantity: z.number().positive().max(1_000_000_000),
});

/**
 * Пачкой, а не по одной позиции: со страницы заявки на склад уезжает весь её список,
 * и половина принятых позиций при обрыве связи хуже, чем ничего (одна транзакция).
 */
export const addItemsSchema = z.strictObject({
  items: z.array(itemSchema).min(1).max(500),
});

/** Правка количества — заменой: прибавляет добавление той же позиции. */
export const updateItemSchema = z.strictObject({
  quantity: z.number().positive().max(1_000_000_000),
});

export type WarehouseItemInput = z.infer<typeof itemSchema>;

export class AddItemsDto extends createZodDto(addItemsSchema) {}
export class UpdateItemDto extends createZodDto(updateItemSchema) {}

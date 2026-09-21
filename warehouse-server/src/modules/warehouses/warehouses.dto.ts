import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { listQuerySchema } from '~/common/pagination';

/** Пустая строка в необязательном поле — «стереть», в базу уходит null, а не ''. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null)
    .nullable()
    .optional();

// Владельца, id, is_active и даты в теле нет: владелец — из токена, остальное ведёт сервис.
// strict — чтобы попытка прислать ownerId падала 400, а не молча отбрасывалась.
const warehouseFields = z.strictObject({
  name: z.string().trim().min(1).max(100),
  address: optionalText(300),
  description: optionalText(500),
  /** Компания склада; null — сделать личным. Нужна роль own/manage в ней. */
  companyId: z.number().int().positive().nullable().optional(),
});

export const createWarehouseSchema = warehouseFields;
export const updateWarehouseSchema = warehouseFields.partial();

export class CreateWarehouseDto extends createZodDto(createWarehouseSchema) {}
export class UpdateWarehouseDto extends createZodDto(updateWarehouseSchema) {}

/** Список складов: к общим ?page/?limit/?q/?state — склады одной компании. */
export const warehouseQuerySchema = listQuerySchema.extend({
  companyId: z.coerce.number().int().positive().optional(),
});
export type WarehouseQuery = z.infer<typeof warehouseQuerySchema>;
export class WarehouseQueryDto extends createZodDto(warehouseQuerySchema) {}

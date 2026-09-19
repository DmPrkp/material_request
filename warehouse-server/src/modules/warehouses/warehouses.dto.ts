import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
});

export const createWarehouseSchema = warehouseFields;
export const updateWarehouseSchema = warehouseFields.partial();

export class CreateWarehouseDto extends createZodDto(createWarehouseSchema) {}
export class UpdateWarehouseDto extends createZodDto(updateWarehouseSchema) {}

import { createZodDto } from 'nestjs-zod';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

import { hasName, nameRequired, optionalText } from '~/common/names';
import { listQuerySchema } from '~/common/pagination';
import { handTools, materialTypes, materials, powerTools } from '~/db/schema';

const managed = { id: true, isActive: true, createdAt: true, updatedAt: true } as const;
// У материалов и ручного инструмента есть автор: createdBy ставит контроллер из токена, из тела не берём.
const authoredManaged = { ...managed, createdBy: true } as const;

/* ----------------------------------------------------------- variant params */

/**
 * Параметр типоразмера так, как его вводят в форме: вид, единица, число.
 * id значения клиент не знает и знать не должен — «6 мм диаметра» сервис найдёт
 * в param_values или заведёт (VariantsService.resolveParams).
 * kindId null — значение без вида (метры у рулеток).
 */
export const variantParamSchema = z.object({
  kindId: z.number().int().positive().nullable(),
  unitId: z.number().int().positive(),
  // numeric(12, 4): восемь знаков до запятой
  value: z.number().positive().lt(1e8),
});
export type VariantParamInput = z.infer<typeof variantParamSchema>;

/**
 * Сборки новой позиции — наборы параметров, заводятся одной транзакцией с ней.
 * Пустой список — одна служебная сборка без параметров (code = id позиции).
 */
const variantSetsSchema = z.array(z.array(variantParamSchema)).max(50).default([]);

/* ------------------------------------------------------------- hand tools */

const handToolFields = createInsertSchema(handTools).omit(authoredManaged).extend({
  // Название — на языке интерфейса, хоть одно обязательно (common/names.ts).
  nameRu: optionalText(100),
  nameEn: optionalText(100),
});
// Создание — сразу со сборками: в расчёт идёт сборка (7:227), а не сама позиция (7).
export const createHandToolSchema = handToolFields
  .extend({ variants: variantSetsSchema })
  .refine(hasName, nameRequired);
// Правка — только название: типоразмеры правятся своими маршрутами.
export const updateHandToolSchema = handToolFields.partial();

export class CreateHandToolDto extends createZodDto(createHandToolSchema) {}
export class UpdateHandToolDto extends createZodDto(updateHandToolSchema) {}

/* ------------------------------------------------------------ power tools */

export const createPowerToolSchema = createInsertSchema(powerTools, {
  nameRu: (s) => s.min(1).max(100),
  nameEn: (s) => s.min(1).max(100),
}).omit(managed);
export const updatePowerToolSchema = createPowerToolSchema.partial();

export class CreatePowerToolDto extends createZodDto(createPowerToolSchema) {}
export class UpdatePowerToolDto extends createZodDto(updatePowerToolSchema) {}

/* --------------------------------------------------------- material types */

export const createMaterialTypeSchema = createInsertSchema(materialTypes, {
  code: (s) => s.min(1).max(32).regex(/^[a-z_]+$/, 'только строчные латинские буквы и подчёркивание'),
  nameRu: (s) => s.min(1).max(100),
  nameEn: (s) => s.min(1).max(100),
}).omit(managed);
export const updateMaterialTypeSchema = createMaterialTypeSchema.partial();

export class CreateMaterialTypeDto extends createZodDto(createMaterialTypeSchema) {}
export class UpdateMaterialTypeDto extends createZodDto(updateMaterialTypeSchema) {}

/* -------------------------------------------------------------- materials */

const materialFields = createInsertSchema(materials).omit(authoredManaged).extend({
  // Название и описание — на языке интерфейса, хоть одно название обязательно (common/names.ts).
  nameRu: optionalText(150),
  nameEn: optionalText(150),
  descriptionRu: optionalText(5000),
  descriptionEn: optionalText(5000),
  unitId: z.number().int().positive(),
  typeId: z.number().int().positive().nullish(),
});
// Как у ручного инструмента: сразу со сборками (13:205:226), правка — только поля материала.
export const createMaterialSchema = materialFields
  .extend({ variants: variantSetsSchema })
  .refine(hasName, nameRequired);
export const updateMaterialSchema = materialFields.partial();

export class CreateMaterialDto extends createZodDto(createMaterialSchema) {}
export class UpdateMaterialDto extends createZodDto(updateMaterialSchema) {}

export const materialQuerySchema = listQuerySchema.extend({
  unitId: z.coerce.number().int().positive().optional(),
  typeId: z.coerce.number().int().positive().optional(),
  /** true — только материалы без проставленного типа. */
  untyped: z.coerce.boolean().optional(),
});
export class MaterialQueryDto extends createZodDto(materialQuerySchema) {}

/* --------------------------------------------------------------- варианты */

/**
 * Вариант — конкретный типоразмер позиции: дюбель Ø8 × 226 мм, рулетка 5 м.
 * `code` не принимаем: он собирается из id позиции и параметров, как в сидах.
 */
export const createVariantSchema = z.object({
  /**
   * Может быть пустым: у позиции без типоразмеров ровно один вариант, и его
   * code — это просто id позиции ('1', '7', '90'). В исходном справочнике
   * таких вариантов 22 из 100 у материалов и 26 из 100 у ручного инструмента.
   *
   * Вид параметра здесь не передаётся — он задан у самого значения.
   */
  paramValueIds: z.array(z.number().int().positive()).default([]),
  /** То же, но тройками: значения, которых ещё нет, сервис заведёт сам (форма на клиенте). */
  params: z.array(variantParamSchema).default([]),
});
export class CreateVariantDto extends createZodDto(createVariantSchema) {}

/** Правка типоразмера: набор параметров заменяется целиком, code пересчитывается. */
export const replaceVariantParamsSchema = z.object({ params: z.array(variantParamSchema) });
export class ReplaceVariantParamsDto extends createZodDto(replaceVariantParamsSchema) {}

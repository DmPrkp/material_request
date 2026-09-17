import { createZodDto } from 'nestjs-zod';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

import { hasName, nameRequired, optionalText } from '~/common/names';
import { listQuerySchema } from '~/common/pagination';
import { systems, workStages, workTypes } from '~/db/schema';

// createdBy — тоже служебное: его проставляет контроллер из токена, а принять его
// из тела значило бы дать записать запись от чужого имени.
const managed = { id: true, isActive: true, createdAt: true, updatedAt: true, createdBy: true } as const;
// isShared — туда же: общей позицию делает только роль автора (common/ownership.ts).
// У этапов своего флага нет — их видимость и права целиком от технологии.
const sharedManaged = { ...managed, isShared: true } as const;

// Название — на языке интерфейса, хоть одно обязательно (common/names.ts).
const name = optionalText(100);
const description = optionalText(200);
/** Технический код; с клиента его не шлют — без него сервис сгенерирует (common/code.ts). */
const code = z.string().trim().min(1).max(50).optional();

export const createWorkTypeSchema = createInsertSchema(workTypes, {
  // code уходит в адрес на клиенте — только латиница в нижнем регистре, цифры и _.
  code: (s) => s.regex(/^[a-z][a-z0-9_]*$/).max(32),
  nameRu: (s) => s.trim().min(1).max(100),
  nameEn: (s) => s.trim().min(1).max(100),
}).omit(sharedManaged);
export const updateWorkTypeSchema = createWorkTypeSchema.partial();

export class CreateWorkTypeDto extends createZodDto(createWorkTypeSchema) {}
export class UpdateWorkTypeDto extends createZodDto(updateWorkTypeSchema) {}

const systemFields = createInsertSchema(systems).omit(sharedManaged).extend({
  title: code,
  nameRu: name,
  nameEn: name,
  descriptionRu: description,
  descriptionEn: description,
  workTypeId: z.number().int().positive(),
  // Обязательна при создании: калькулятор без неё не подпишет поля объёма.
  unitId: z.number().int().positive(),
});
export const createSystemSchema = systemFields.refine(hasName, nameRequired);
// Без refine: правка трогает один язык, а стереть последнее название не даст CHECK в базе.
export const updateSystemSchema = systemFields.partial();

export class CreateSystemDto extends createZodDto(createSystemSchema) {}
export class UpdateSystemDto extends createZodDto(updateSystemSchema) {}

export const systemQuerySchema = listQuerySchema.extend({
  workTypeId: z.coerce.number().int().positive().optional(),
});
export class SystemQueryDto extends createZodDto(systemQuerySchema) {}

const workStageFields = createInsertSchema(workStages).omit(managed).extend({
  title: code,
  nameRu: name,
  nameEn: name,
  systemId: z.number().int().positive(),
  // Необязательна: без неё этап встаёт последним в системе (см. WorkStagesService.create).
  position: z.number().int().min(1).max(32767).optional(),
});
export const createWorkStageSchema = workStageFields.refine(hasName, nameRequired);
export const updateWorkStageSchema = workStageFields.partial();

export class CreateWorkStageDto extends createZodDto(createWorkStageSchema) {}
export class UpdateWorkStageDto extends createZodDto(updateWorkStageSchema) {}

export const workStageQuerySchema = listQuerySchema.extend({
  systemId: z.coerce.number().int().positive().optional(),
});
export class WorkStageQueryDto extends createZodDto(workStageQuerySchema) {}

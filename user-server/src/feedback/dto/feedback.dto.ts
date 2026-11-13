import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { FEEDBACK_TOPICS } from '~/db/schema';

/**
 * Тема — из списка, не произвольная строка: по ней админка фильтрует, и свободный ввод
 * превратил бы её в свалку. Потолок текста — чтобы в базу не уехал мегабайт из буфера.
 */
export const createFeedbackSchema = z.strictObject({
  topic: z.enum(FEEDBACK_TOPICS),
  message: z.string().trim().min(1).max(4000),
});

export class CreateFeedbackDto extends createZodDto(createFeedbackSchema) {}

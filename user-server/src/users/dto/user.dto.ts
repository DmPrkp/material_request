import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email().max(320));

/**
 * Правка своего профиля. `email: null` — убрать адрес совсем (тогда и восстановление
 * по нему перестанет работать). Новый адрес всегда приходит неподтверждённым: пока по
 * ссылке из письма не перешли, восстановить им пароль нельзя.
 */
export const updateMeSchema = z
  .strictObject({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().max(100).nullable().optional(),
    email: email.nullable().optional(),
    locale: z.enum(['ru', 'en']).default('ru'),
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'locale'), {
    message: 'Нечего менять',
  });

export class UpdateMeDto extends createZodDto(updateMeSchema) {}

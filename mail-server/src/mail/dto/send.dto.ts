import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { LOCALES, TEMPLATE_NAMES } from '../templates';

/**
 * Что можно попросить отправить. Произвольных темы и текста тут намеренно нет:
 * вызывающий выбирает шаблон из списка и передаёт ссылку. Попавший во внутреннюю сеть
 * не сможет разослать от подтверждённого домена zayavka.app что угодно — только то,
 * что и так шлёт приложение.
 *
 * strict — лишнее поле падает 400, а не отбрасывается молча: контракт между сервисами
 * лучше ломать громко.
 */
export const sendSchema = z.strictObject({
  to: z.string().trim().toLowerCase().pipe(z.email()),
  template: z.enum(TEMPLATE_NAMES),
  locale: z.enum(LOCALES).default('ru'),
  /** Проверяется ещё раз в MailService: домен обязан быть нашим. */
  link: z.string().trim().pipe(z.url()),
  name: z.string().trim().min(1).max(100).optional(),
  hours: z.number().int().positive().max(168).default(24),
});

export class SendDto extends createZodDto(sendSchema) {}

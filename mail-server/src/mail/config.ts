/**
 * Настройки релея из окружения. Секреты сервису отдаёт compose — как JWT_SECRET
 * достаётся только user-server и nginx, так MAIL_* достаётся только этому сервису.
 *
 * Без MAIL_HOST не стартуем: молча не отправляющая почта хуже не поднявшегося сервиса —
 * человек не получит письмо и не узнает почему.
 */
export type MailConfig = {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
  fromName: string;
  replyTo?: string;
  /** Ссылки в письмах обязаны начинаться с него — см. MailService. */
  appUrl: string;
};

export const MAIL_CONFIG = Symbol('MAIL_CONFIG');

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

export function mailConfigFromEnv(env: NodeJS.ProcessEnv = process.env): MailConfig {
  const host = trimmed(env.MAIL_HOST);
  if (!host) throw new Error('Нет MAIL_HOST — сервису почты нечем отправлять письма');

  const port = Number(env.MAIL_PORT ?? 587);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`MAIL_PORT не похож на порт: ${env.MAIL_PORT}`);

  return {
    host,
    port,
    user: trimmed(env.MAIL_USER),
    password: trimmed(env.MAIL_PASSWORD),
    from: trimmed(env.MAIL_FROM) ?? 'noreply@zayavka.app',
    fromName: trimmed(env.MAIL_FROM_NAME) ?? 'Заявка',
    replyTo: trimmed(env.MAIL_REPLY_TO),
    appUrl: (trimmed(env.APP_URL) ?? 'https://zayavka.app').replace(/\/$/, ''),
  };
}

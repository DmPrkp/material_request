import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** Виджет отдаёт данные сразу после нажатия; час — с запасом на часы клиента, но не на повтор перехваченного. */
export const TELEGRAM_AUTH_MAX_AGE_S = 3600;

/**
 * Проверка подписи Telegram Login Widget (https://core.telegram.org/widgets/login):
 * HMAC-SHA256 от строки `key=value` всех полей кроме hash, отсортированных по ключу и
 * склеенных переводом строки; ключ — sha256 от токена бота. Без проверки `auth_date`
 * подпись одного входа годилась бы вечно.
 */
export function verifyTelegramAuth(
  data: Record<string, unknown> & { hash: string; auth_date: number },
  botToken: string,
  nowMs: number = Date.now(),
): boolean {
  const checkString = Object.keys(data)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${String(data[key])}`)
    .join('\n');

  const secret = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest();
  const given = Buffer.from(data.hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;

  return nowMs / 1000 - data.auth_date <= TELEGRAM_AUTH_MAX_AGE_S;
}

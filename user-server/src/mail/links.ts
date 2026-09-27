/**
 * Ссылки в письмах. Собираем здесь, а не в mail-server: тот про токены не знает,
 * ему приезжает готовый адрес. Локаль — часть пути, как во всём клиенте.
 *
 * APP_URL обязан совпадать с тем, что знает mail-server: чужой домен он не пропустит.
 */
const appUrl = (): string => (process.env.APP_URL || 'https://zayavka.app').replace(/\/$/, '');

export type Locale = 'ru' | 'en';

export const verifyLink = (token: string, locale: Locale): string =>
  `${appUrl()}/${locale}/auth/verify?token=${encodeURIComponent(token)}`;

export const resetLink = (token: string, locale: Locale): string =>
  `${appUrl()}/${locale}/auth/reset?token=${encodeURIComponent(token)}`;

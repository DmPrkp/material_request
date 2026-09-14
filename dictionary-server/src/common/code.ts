import { randomBytes } from 'node:crypto';

/**
 * Технический код (title) для технологий и этапов, заведённых с клиента.
 *
 * title — уникальный идентификатор: по нему ходят calc-server и ключи i18n
 * калькулятора, а человек в форме вводит только названия. Читаемая часть — из
 * английского названия, случайный хвост — чтобы два одинаковых этапа в разных
 * технологиях не упёрлись в UNIQUE: такое совпадение законно.
 */
export function generateCode(source: unknown, maxLength = 50): string {
  const suffix = randomBytes(3).toString('hex');
  const slug = (typeof source === 'string' ? source : '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength - suffix.length - 1)
    .replace(/_+$/, '');

  return `${slug || 'item'}_${suffix}`;
}

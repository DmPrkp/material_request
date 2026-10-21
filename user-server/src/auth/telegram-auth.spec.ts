import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { TELEGRAM_AUTH_MAX_AGE_S, verifyTelegramAuth } from './telegram-auth';

const TOKEN = '123456:test-token';
const NOW = 1_800_000_000_000;

function sign(fields: Record<string, string | number>, token = TOKEN) {
  const check = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');
  const key = createHash('sha256').update(token).digest();
  return createHmac('sha256', key).update(check).digest('hex');
}

function payload(overrides: Record<string, string | number> = {}) {
  const fields = { id: 42, first_name: 'Иван', username: 'ivan', auth_date: NOW / 1000 - 10, ...overrides };
  return { ...fields, hash: sign(fields) };
}

describe('verifyTelegramAuth', () => {
  it('принимает корректную подпись', () => {
    expect(verifyTelegramAuth(payload(), TOKEN, NOW)).toBe(true);
  });

  it('отвергает подмену поля', () => {
    expect(verifyTelegramAuth({ ...payload(), id: 43 }, TOKEN, NOW)).toBe(false);
  });

  it('отвергает подпись чужим токеном', () => {
    expect(verifyTelegramAuth(payload(), 'other:token', NOW)).toBe(false);
  });

  it('отвергает устаревший вход', () => {
    const old = payload({ auth_date: NOW / 1000 - TELEGRAM_AUTH_MAX_AGE_S - 1 });
    expect(verifyTelegramAuth(old, TOKEN, NOW)).toBe(false);
  });

  it('считает подпись и по неизвестным полям', () => {
    const extra = payload({ photo_url: 'https://t.me/x.jpg' });
    expect(verifyTelegramAuth(extra, TOKEN, NOW)).toBe(true);
    expect(verifyTelegramAuth({ ...extra, photo_url: 'https://evil' }, TOKEN, NOW)).toBe(false);
  });
});

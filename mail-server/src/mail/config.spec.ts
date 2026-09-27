import { describe, expect, it } from 'vitest';

import { mailConfigFromEnv } from './config';

describe('mailConfigFromEnv', () => {
  it('без MAIL_HOST не даёт подняться', () => {
    expect(() => mailConfigFromEnv({})).toThrow(/MAIL_HOST/);
  });

  it('пустая строка в MAIL_HOST — то же, что её отсутствие', () => {
    expect(() => mailConfigFromEnv({ MAIL_HOST: '   ' })).toThrow(/MAIL_HOST/);
  });

  it('умолчания: порт 587, отправитель и адрес приложения', () => {
    const config = mailConfigFromEnv({ MAIL_HOST: 'connect.smtp.bz' });

    expect(config.port).toBe(587);
    expect(config.from).toBe('noreply@zayavka.app');
    expect(config.appUrl).toBe('https://zayavka.app');
    expect(config.user).toBeUndefined();
  });

  it('хвостовой слэш в APP_URL убираем — иначе ссылки склеиваются с двойным', () => {
    const config = mailConfigFromEnv({ MAIL_HOST: 'mailhog', APP_URL: 'http://localhost/' });

    expect(config.appUrl).toBe('http://localhost');
  });

  it('не число в MAIL_PORT — ошибка, а не молчаливый NaN', () => {
    expect(() => mailConfigFromEnv({ MAIL_HOST: 'mailhog', MAIL_PORT: 'пятьсот' })).toThrow(/MAIL_PORT/);
  });
});

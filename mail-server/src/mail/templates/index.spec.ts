import { describe, expect, it } from 'vitest';

import { LOCALES, renderLetter, TEMPLATE_NAMES } from './index';

const LINK = 'https://zayavka.app/ru/auth/verify?token=abc';

describe('renderLetter', () => {
  it.each(TEMPLATE_NAMES.flatMap((name) => LOCALES.map((locale) => [name, locale] as const)))(
    '%s/%s: тема, ссылка в обеих версиях и никаких пустых мест',
    (name, locale) => {
      const letter = renderLetter(name, locale, { link: LINK, name: 'Дмитрий', hours: 24 });

      expect(letter.subject).not.toHaveLength(0);
      expect(letter.text).toContain(LINK);
      expect(letter.html).toContain(LINK);
      expect(letter.text).toContain('Дмитрий');
      expect(letter.text).not.toMatch(/undefined|\[object|\$\{/);
      expect(letter.html).not.toMatch(/undefined|\[object|\$\{/);
    },
  );

  it('без имени — здоровается без запятой, а не «Здравствуйте, undefined»', () => {
    const letter = renderLetter('reset', 'ru', { link: LINK, hours: 24 });

    expect(letter.text).toContain('Здравствуйте!');
    expect(letter.text).not.toContain('undefined');
  });

  it('склоняет часы: 1 час, 3 часа, 24 часа, 11 часов', () => {
    const hoursIn = (hours: number) => renderLetter('reset', 'ru', { link: LINK, hours }).text;

    expect(hoursIn(1)).toContain('1 час ');
    expect(hoursIn(3)).toContain('3 часа');
    expect(hoursIn(24)).toContain('24 часа');
    expect(hoursIn(11)).toContain('11 часов');
  });

  it('экранирует html: кавычка в имени не ломает вёрстку письма', () => {
    const letter = renderLetter('verify', 'ru', { link: LINK, name: '<b>"Вася"</b>', hours: 1 });

    expect(letter.html).not.toContain('<b>"Вася"</b>');
    expect(letter.html).toContain('&lt;b&gt;');
  });

  it('у разных шаблонов разные темы — письма не путаются', () => {
    const verify = renderLetter('verify', 'ru', { link: LINK, hours: 24 });
    const reset = renderLetter('reset', 'ru', { link: LINK, hours: 24 });

    expect(verify.subject).not.toBe(reset.subject);
  });
});

import { type Layout, renderHtml, renderText } from './layout';

export const LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const TEMPLATE_NAMES = ['verify', 'reset'] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export type TemplateParams = {
  /** Полная ссылка с токеном; собирает её user-server, почта про токены не знает. */
  link: string;
  /** Имя из профиля — необязательно: у заявки без входа его может не быть. */
  name?: string;
  /** Сколько часов живёт ссылка — печатаем в письме, чтобы человек не гадал. */
  hours: number;
};

export type Letter = { subject: string; text: string; html: string };

const greeting = (locale: Locale, name?: string): string => {
  if (locale === 'en') return name ? `Hello, ${name}!` : 'Hello!';
  return name ? `Здравствуйте, ${name}!` : 'Здравствуйте!';
};

const brand = (locale: Locale): string =>
  locale === 'en' ? 'Zayavka — zayavka.app' : 'Заявка — zayavka.app';

const hoursRu = (hours: number): string => {
  // 21 час, 22 часа, 25 часов: без этого в письме оказывалось «24 часа(ов)».
  const last = hours % 10;
  const teen = hours % 100 >= 11 && hours % 100 <= 14;
  if (!teen && last === 1) return `${hours} час`;
  if (!teen && last >= 2 && last <= 4) return `${hours} часа`;
  return `${hours} часов`;
};

const BUILDERS: Record<TemplateName, Record<Locale, (params: TemplateParams) => Layout>> = {
  verify: {
    ru: (p) => ({
      title: 'Подтвердите адрес почты',
      greeting: greeting('ru', p.name),
      lead: 'Вы указали этот адрес в приложении «Заявка». Подтвердите его — тогда по нему можно будет восстановить пароль.',
      buttonLabel: 'Подтвердить адрес',
      link: p.link,
      note: `Ссылка действует ${hoursRu(p.hours)}.`,
      footer:
        'Если вы ничего не указывали, просто удалите это письмо: пока по ссылке не перешли, адрес ни к чему не привязан.',
      brand: brand('ru'),
    }),
    en: (p) => ({
      title: 'Confirm your email',
      greeting: greeting('en', p.name),
      lead: 'This address was entered in Zayavka. Confirm it so it can be used to restore your password.',
      buttonLabel: 'Confirm address',
      link: p.link,
      note: `The link is valid for ${p.hours} hours.`,
      footer:
        'If it was not you, just delete this email: until the link is opened, the address is not attached to anything.',
      brand: brand('en'),
    }),
  },
  reset: {
    ru: (p) => ({
      title: 'Восстановление пароля',
      greeting: greeting('ru', p.name),
      lead: 'Кто-то запросил смену пароля в приложении «Заявка». Если это вы — задайте новый пароль по ссылке.',
      buttonLabel: 'Задать новый пароль',
      link: p.link,
      note: `Ссылка действует ${hoursRu(p.hours)} и сработает один раз.`,
      footer: 'Если вы ничего не запрашивали, просто удалите это письмо — пароль останется прежним.',
      brand: brand('ru'),
    }),
    en: (p) => ({
      title: 'Password reset',
      greeting: greeting('en', p.name),
      lead: 'Somebody asked to change the password in Zayavka. If that was you, set a new one via the link.',
      buttonLabel: 'Set a new password',
      link: p.link,
      note: `The link is valid for ${p.hours} hours and works once.`,
      footer: 'If it was not you, just delete this email — the password stays as it is.',
      brand: brand('en'),
    }),
  },
};

export function renderLetter(name: TemplateName, locale: Locale, params: TemplateParams): Letter {
  const parts = BUILDERS[name][locale](params);
  return { subject: parts.title, text: renderText(parts), html: renderHtml(parts) };
}

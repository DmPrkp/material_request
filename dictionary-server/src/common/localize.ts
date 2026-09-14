/**
 * Язык ответа словаря.
 *
 * В базе у позиций по полю на язык (nameRu/nameEn, descriptionRu/descriptionEn),
 * а наружу уходит одно — name, description — на языке запроса. Клиент берёт язык
 * из своего адреса (/ru/...) и шлёт в Accept-Language; не знаем такой — русский.
 *
 * На запрошенном языке пусто — отдаём ближайшее заполненное: сначала русское,
 * потом остальные. Названия с клиента пишутся только на языке, на котором
 * человек работал, и технологию, заведённую под /en, под /ru надо показать
 * хотя бы по-английски, а не пустотой.
 *
 * Сворачивается любая пара xRu + xEn в любом месте ответа, включая вложенные
 * unit / type / kind, — новые двуязычные колонки подхватятся без правок здесь.
 * Писать (POST/PATCH) по-прежнему нужно оба поля: это только про выдачу.
 */
export const LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ru';

const SUFFIX: Record<Locale, string> = { ru: 'Ru', en: 'En' };
const SUFFIXES = Object.values(SUFFIX);

/**
 * "en-US,en;q=0.9" -> "en". Берём первый поддерживаемый по порядку, без разбора q:
 * клиент шлёт ровно один язык, а браузеры и так перечисляют по убыванию веса.
 */
export function resolveLocale(header: string | string[] | undefined): Locale {
  const raw = Array.isArray(header) ? header.join(',') : (header ?? '');
  for (const part of raw.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if ((LOCALES as readonly string[]).includes(tag)) return tag as Locale;
  }
  return DEFAULT_LOCALE;
}

/** Язык запроса, потом русский, потом остальные — в этом порядке ищем заполненное. */
function fallbackOrder(locale: Locale): Locale[] {
  return [locale, DEFAULT_LOCALE, ...LOCALES].filter((item, index, all) => all.indexOf(item) === index);
}

const isFilled = (value: unknown) => value !== null && value !== undefined && value !== '';

/** Строки из drizzle — обычные объекты; Date и прочие экземпляры не трогаем. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** 'nameRu' -> 'name', но только если у объекта есть поле на каждом языке. */
function pairBase(key: string, source: Record<string, unknown>): string | undefined {
  const suffix = SUFFIXES.find((s) => key.length > s.length && key.endsWith(s));
  if (!suffix) return undefined;

  const base = key.slice(0, -suffix.length);
  return SUFFIXES.every((s) => `${base}${s}` in source) ? base : undefined;
}

export function localize(value: unknown, locale: Locale): unknown {
  if (Array.isArray(value)) return value.map((item) => localize(item, locale));
  if (!isPlainObject(value)) return value;

  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    const base = pairBase(key, value);

    if (base === undefined) {
      result[key] = localize(field, locale);
    } else if (!(base in result)) {
      // Пустая строка — тоже «не заполнено».
      const found = fallbackOrder(locale)
        .map((item) => value[`${base}${SUFFIX[item]}`])
        .find(isFilled);
      result[base] = found ?? null;
    }
  }
  return result;
}

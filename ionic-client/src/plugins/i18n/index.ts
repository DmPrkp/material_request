import { createI18n } from "vue-i18n";
import { Locale } from "@/types";
import BaseModel from "@/models/BaseModel";

type LocaleModule = { default: Record<string, unknown> };

/** Каждый словарь попадает в отдельный чанк и грузится по требованию. */
const localeLoaders = Object.entries(
  import.meta.glob("./locales/*.json") as Record<
    string,
    () => Promise<LocaleModule>
  >
).reduce(
  (acc, [path, loader]) => {
    const code = path.match(/([\w-]+)\.json$/)?.[1];
    if (code) acc[code as Locale] = loader;
    return acc;
  },
  {} as Record<Locale, () => Promise<LocaleModule>>
);

export const SUPPORTED_LOCALES = Object.keys(localeLoaders) as Locale[];
export const LOCALE_STORAGE_KEY = "user-locale";

export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (SUPPORTED_LOCALES as string[]).includes(value)
  );
}

/** "ru-RU" -> "ru", неизвестное значение -> null */
export function normalizeLocale(
  value?: string | string[] | null
): Locale | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  if (isSupportedLocale(raw)) return raw;
  const withoutRegion = raw.split("-")[0];
  return isSupportedLocale(withoutRegion) ? withoutRegion : null;
}

export const DEFAULT_LOCALE: Locale =
  normalizeLocale(import.meta.env.VITE_DEFAULT_LOCALE) || "ru";

function getStoredLocale(): Locale | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function getLocaleFromPath(): Locale | null {
  if (typeof window === "undefined") return null;
  return normalizeLocale(window.location.pathname.split("/")[1]);
}

function getBrowserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;
  return normalizeLocale(navigator.language);
}

/** Приоритет: локаль из URL -> сохранённая -> язык браузера -> дефолтная */
export function resolveInitialLocale(): Locale {
  return (
    getLocaleFromPath() ||
    getStoredLocale() ||
    getBrowserLocale() ||
    DEFAULT_LOCALE
  );
}

const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  globalInjection: true,
  messages: {},
});

/** Подтягивает словарь один раз; повторные вызовы бесплатны. */
export async function loadLocaleMessages(locale: Locale) {
  if (i18n.global.availableLocales.includes(locale)) return;

  const loader = localeLoaders[locale];
  if (!loader) return;

  const messages = await loader();
  i18n.global.setLocaleMessage(locale, messages.default);
}

/** Единая точка смены языка: словарь + i18n + <html lang> + localStorage */
export async function setI18nLocale(value: Locale) {
  await loadLocaleMessages(value);

  // Язык ответов словаря (одно name вместо nameRu/nameEn). До смены локали:
  // страницы перечитывают данные в watch(locale), и запрос должен уйти уже с ним.
  BaseModel.setLocale(value);

  if (i18n.global.locale.value !== value) {
    i18n.global.locale.value = value;
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = value;
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, value);
    } catch {
      /* приватный режим — просто не сохраняем */
    }
  }
}

export default i18n;

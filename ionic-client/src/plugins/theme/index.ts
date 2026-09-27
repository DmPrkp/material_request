import Cookies from "js-cookie";
import { readonly, ref } from "vue";

/**
 * Тема живёт в куке theme_mode и классе dark на <body>.
 *
 * Применение намеренно вынесено из компонента-переключателя: он переехал
 * в настройки, а тема должна вставать на любой странице, а не только после
 * захода туда. По той же причине, что и локаль в plugins/i18n.
 */
export type Theme = "light" | "dark";

export const THEME_COOKIE = "theme_mode";

const DARK_CLASS = "dark";

/**
 * Текущая тема реактивно — для того, что рисуется по-разному в светлой и тёмной, а
 * не только красится CSS: скриншоты главной. Лишнюю тему там не прячут display:none,
 * а не рисуют вовсе — иначе браузер качал бы обе.
 */
const themeState = ref<Theme>("light");
export const activeTheme = readonly(themeState);

function storedTheme(): Theme | null {
  const value = Cookies.get(THEME_COOKIE);
  return value === "dark" || value === "light" ? value : null;
}

function prefersDark(): boolean {
  // matchMedia нет в jsdom, поэтому вызов необязательный.
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** Приоритет: сохранённая тема -> системная -> светлая. */
export function resolveInitialTheme(): Theme {
  return storedTheme() ?? (prefersDark() ? "dark" : "light");
}

export function currentTheme(): Theme {
  return document.body.classList.contains(DARK_CLASS) ? "dark" : "light";
}

/** Единая точка смены темы: класс на body + кука на год. */
export function setTheme(theme: Theme): void {
  document.body.classList.toggle(DARK_CLASS, theme === "dark");
  themeState.value = theme;
  Cookies.set(THEME_COOKIE, theme, { expires: 365 });
}

/**
 * Тема при старте приложения. Куку здесь не пишем: раньше системная тема
 * сразу сохранялась и залипала — пользователь переключал систему на светлую,
 * а приложение оставалось тёмным. Пишем только явный выбор из настроек.
 */
export function applyInitialTheme(): void {
  themeState.value = resolveInitialTheme();
  document.body.classList.toggle(DARK_CLASS, themeState.value === "dark");
}

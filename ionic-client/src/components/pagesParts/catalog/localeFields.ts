import { HttpError } from "@/models/BaseModel";

/**
 * Общее для форм справочника (технология, материал, ручной инструмент).
 *
 * Название и описание вводятся на языке страницы и пишутся только в его колонки
 * (nameRu под /ru, nameEn под /en); остальные языки не трогаем. Показывает словарь
 * потом ближайшее заполненное, поэтому в пустом поле подсказкой стоит оно.
 */

/** Суффикс колонок языка; порядок — как у словаря: сначала русский. */
export type LocaleSuffix = "Ru" | "En";
export const SUFFIXES: LocaleSuffix[] = ["Ru", "En"];

/** 'en' -> 'En'; язык без своих колонок — пишем в русские. */
export function suffixFor(lang: string): LocaleSuffix {
  const candidate = lang.charAt(0).toUpperCase() + lang.slice(1);
  return (SUFFIXES as string[]).includes(candidate)
    ? (candidate as LocaleSuffix)
    : "Ru";
}

/** field(material, "name", "En") -> material.nameEn, пустое — "". */
export function field(record: object, base: string, lang: LocaleSuffix): string {
  const value = (record as Record<string, unknown>)[`${base}${lang}`];
  return typeof value === "string" ? value : "";
}

/** Ближайшее заполненное на других языках — то, что словарь покажет вместо пустоты. */
export function otherFilled(
  record: object,
  base: string,
  own: LocaleSuffix,
): string {
  for (const lang of SUFFIXES) {
    if (lang === own) continue;
    const value = field(record, base, lang);
    if (value) return value;
  }
  return "";
}

/** { nameEn: value } под /en — тело запроса только с колонкой языка формы. */
export function inLocale<B extends string>(
  base: B,
  value: string | null,
  lang: LocaleSuffix,
) {
  return { [`${base}${lang}`]: value } as Partial<
    Record<`${B}${LocaleSuffix}`, string | null>
  >;
}

/** Текст ошибки сохранения по статусу ответа словаря. */
export function saveErrorText(
  t: (key: string) => string,
  cause: unknown,
): string {
  const status = cause instanceof HttpError ? cause.status : undefined;
  if (status === 401) return t("pages.catalog.structure.errors.unauthorized");
  if (status === 409) return t("pages.catalog.structure.errors.exists");
  if (status === 503) return t("pages.catalog.structure.errors.unavailable");
  return t("pages.catalog.structure.errors.generic");
}

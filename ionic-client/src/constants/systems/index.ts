import type { ImageType } from "@/types/entity/image";

/**
 * Снимки к технологиям калькулятора, по техническому коду технологии (title).
 *
 * Сами технологии калькулятор берёт из словаря — раньше они лежали здесь списком,
 * и каждая новая требовала правки клиента, а заведённая пользователем не появлялась
 * вовсе. В словаре картинок нет и не будет, поэтому снимок остаётся здесь: у кого
 * его нет — карточка рисует иконку.
 */
export const SYSTEM_IMAGES: Record<string, ImageType> = {
  EIFS: { src: "/system/wet-facade-narrow.jpg", alt: "wet-facade" },
  frame_scaffold: { src: "/system/scaffold.jpg", alt: "scaffold" },
  flat: { src: "/system/flat-roof.jpg", alt: "flat-roof" },
  // Схема, а не снимок: нарисована вручную под палитру приложения.
  GKL_C112: { src: "/system/drywall-partition.svg", alt: "drywall-partition" },
};

/**
 * Группы технологий внутри вида работ: «Внутренние работы → Перегородки → Гипсокартон».
 *
 * Живут на клиенте, а не в словаре: это способ разложить плитку, а не свойство
 * технологии. Отсюда и i18n-подпись по коду группы — в отличие от названий
 * технологий, которые приходят с сервера уже переведёнными.
 *
 * Технология, не попавшая ни в одну группу, не исчезает: экран вида работ
 * показывает её рядом с группами. Поэтому новая технология в словаре видна сразу,
 * даже если её сюда не вписали.
 */
export type SystemGroup = {
  /** Код группы — сегмент адреса и ключ i18n (pages.main.types.<code>). */
  code: string;
  /** Технические коды технологий (systems.title) в порядке показа. */
  systems: string[];
};

export const SYSTEM_GROUPS: Record<string, SystemGroup[]> = {
  interior: [{ code: "partitions", systems: ["GKL_C112"] }],
};

/** Группы вида работ; у кого их нет — пустой список, плитка покажет технологии. */
export function groupsOf(workTypeCode: string): SystemGroup[] {
  return SYSTEM_GROUPS[workTypeCode] ?? [];
}

/** Технологии, разложенные по группам этого вида работ. */
export function groupedTitles(workTypeCode: string): Set<string> {
  return new Set(groupsOf(workTypeCode).flatMap((group) => group.systems));
}

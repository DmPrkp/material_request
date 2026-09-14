import {
  cubeOutline,
  flashOutline,
  hammerOutline,
  layersOutline,
} from "ionicons/icons";
import type { MainMenuItem } from "@/types/controller/main-menu";

/** Разделы сборников — они же сегмент роута /:locale/catalog/:tab. */
export const CATALOG_TABS = ["materials", "hand_tools", "power_tools"] as const;

export type CatalogTab = (typeof CATALOG_TABS)[number];

export const DEFAULT_CATALOG_TAB: CatalogTab = "materials";

/**
 * Меню сборников — та же плитка, что и на главной, поэтому и тип общий.
 * Фотографий для разделов пока нет: положите их в public/catalog-menu и
 * замените icon на img — карточка отрисуется снимком без других правок.
 */
export const CATALOG_MENU: MainMenuItem[] = [
  {
    title: "materials",
    description: "materials catalog",
    img: {
      src: "/catalog/materials.jpg",
      alt: "materials",
      width: 150,
    },
  },
  {
    title: "hand_tools",
    description: "hand tools catalog",
    img: {
      src: "/catalog/hand-tools.jpg",
      alt: "materials",
      width: 150,
    },
  },
  {
    title: "power_tools",
    description: "power tools catalog",
    img: {
      src: "/catalog/power-tools.jpg",
      alt: "materials",
      width: 150,
    },
  },
  {
    // Не вкладка CATALOG_TABS, а свой роут catalog-systems: см. src/router/index.ts.
    title: "systems",
    description: "work technologies and stages",
    icon: layersOutline,
  },
];

/** Неизвестный раздел в адресе -> null, чтобы гвард увёл в меню сборников. */
export function normalizeCatalogTab(
  value?: string | string[] | null,
): CatalogTab | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && (CATALOG_TABS as readonly string[]).includes(raw)
    ? (raw as CatalogTab)
    : null;
}

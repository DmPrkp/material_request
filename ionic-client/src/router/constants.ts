// Только типы и чистые данные: файл читает ещё и vite.config.ts при сборке
// (seo-prerender.ts), в Node — без браузера и без алиасов вне import type.
import type { Locale, SeoPages } from "@/types";

/** Адрес прода для canonical, hreflang, og:url и sitemap. */
export const SITE_URL = "https://zayavka.app";
export const SITE_NAME = "Zayávka";
export const OG_IMAGE = `${SITE_URL}/logo-img.jpg`;

/** Страница без своего ключа — дочерние технологии из словаря и прочее. */
const defaultSeo: SeoPages[string] = {
  title: {
    en: "Construction materials calculator and requests",
    ru: "Калькулятор строительных материалов и заявки",
  },
  description: {
    en: "Calculate materials, hand and power tools for a work technology and put together a request for your crew or procurement. Free, no sign-up required.",
    ru: "Расчёт материалов, ручного и электроинструмента по технологии работ и заявка для бригады или снабжения. Бесплатно и без регистрации.",
  },
};

/** Неизвестный адрес: путь любой, поэтому не ключом в seoPages. */
const notFoundSeo: SeoPages[string] = {
  title: { en: "Page not found", ru: "Страница не найдена" },
  description: defaultSeo.description,
};

/**
 * SEO по адресу без локали: ключ — до четырёх сегментов после /:locale
 * (zayavka/calculator/facade/EIFS). Каждый ключ — индексируемая страница: из них
 * при сборке строятся sitemap и HTML со своими мета-тегами (seo-prerender.ts).
 * Новый индексируемый роут — просто ключ здесь.
 */
const seoPages: SeoPages = {
  // Стартовая: «/» и «/ru» ведут сюда, для поисковика это главная.
  zayavka: {
    title: {
      en: "Construction material requests and quantity calculator",
      ru: "Заявки на строительные материалы и калькулятор расхода",
    },
    description: defaultSeo.description,
  },
  "zayavka/calculator": {
    title: {
      en: "Construction materials calculator: types of work",
      ru: "Калькулятор строительных материалов: виды работ",
    },
    description: {
      en: "Choose a type of work — facade, roof, interior finishing — and get the list of materials, hand and power tools with quantities for your area.",
      ru: "Выберите вид работ — фасад, кровля, внутренняя отделка — и получите список материалов, ручного и электроинструмента с расходом на ваш объём.",
    },
  },
  "zayavka/calculator/facade": {
    title: {
      en: "Facade materials calculation",
      ru: "Расчёт материалов для фасада",
    },
    description: {
      en: "Facade works calculator: EIFS and frame scaffolding. Materials, tools and consumption for the given facade area.",
      ru: "Калькулятор фасадных работ: мокрый фасад и рамные леса. Материалы, инструмент и расход на заданную площадь фасада.",
    },
  },
  "zayavka/calculator/facade/EIFS": {
    title: {
      en: "EIFS materials calculation",
      ru: "Расчёт материалов для мокрого фасада",
    },
    description: {
      en: "EIFS material consumption by work stages — surface preparation, insulation, reinforcing layer, finish — plus tools for the crew.",
      ru: "Расход материалов на мокрый фасад по этапам: подготовка основания, утепление, армирующий слой, отделка — и инструмент для бригады.",
    },
  },
  "zayavka/calculator/facade/frame_scaffold": {
    title: {
      en: "Frame scaffolding calculation",
      ru: "Расчёт рамных строительных лесов",
    },
    description: {
      en: "Frame scaffolding components for your facade area and tools for assembly.",
      ru: "Комплектующие рамных лесов на площадь фасада и инструмент для монтажа.",
    },
  },
  "zayavka/calculator/interior": {
    title: {
      en: "Interior finishing materials calculation",
      ru: "Расчёт материалов для внутренней отделки",
    },
    description: {
      en: "Interior finishing calculator: partitions and surfaces. Materials, tools and consumption for your area.",
      ru: "Калькулятор внутренней отделки: перегородки и поверхности. Материалы, инструмент и расход на вашу площадь.",
    },
  },
  "zayavka/calculator/interior/GKL_C112": {
    title: {
      en: "C112 drywall partition calculation",
      ru: "Расчёт перегородки из гипсокартона С112",
    },
    description: {
      en: "Materials and tools for a C112 partition — single metal frame, double-layer board on both sides — by stages: layout, frame, cladding, joints.",
      ru: "Материалы и инструмент на перегородку С112 — одинарный каркас, двухслойная обшивка ГКЛ с двух сторон — по этапам: разметка, каркас, обшивка, швы.",
    },
  },
  catalog: {
    title: {
      en: "Catalogs: materials, hand and power tools",
      ru: "Сборники: материалы, ручной и электроинструмент",
    },
    description: {
      en: "Reference of construction materials, hand and power tools, work technologies and stages with consumption rates.",
      ru: "Справочник строительных материалов, ручного и электроинструмента, технологий и этапов работ с нормами расхода.",
    },
  },
  "catalog/materials": {
    title: {
      en: "Construction materials catalog",
      ru: "Сборник строительных материалов",
    },
    description: {
      en: "Construction materials with sizes and variants: used in consumption calculations and requests.",
      ru: "Строительные материалы с типоразмерами и вариантами исполнения — основа расчёта расхода и заявок.",
    },
  },
  "catalog/hand_tools": {
    title: {
      en: "Hand tools catalog",
      ru: "Сборник ручного инструмента",
    },
    description: {
      en: "Hand tools for construction works with sizes: what the crew needs for each work stage.",
      ru: "Ручной инструмент для строительных работ с типоразмерами: что нужно бригаде на каждом этапе.",
    },
  },
  "catalog/power_tools": {
    title: {
      en: "Power tools catalog",
      ru: "Сборник электроинструмента",
    },
    description: {
      en: "Corded and cordless power tools for construction works.",
      ru: "Сетевой и аккумуляторный электроинструмент для строительных работ.",
    },
  },
  "catalog/power_tools/corded": {
    title: {
      en: "Corded power tools catalog",
      ru: "Сборник сетевого электроинструмента",
    },
    description: {
      en: "Corded power tools for construction works: what the crew needs on site.",
      ru: "Сетевой электроинструмент для строительных работ: что нужно бригаде на объекте.",
    },
  },
  "catalog/power_tools/cordless": {
    title: {
      en: "Cordless power tools catalog",
      ru: "Сборник аккумуляторного электроинструмента",
    },
    description: {
      en: "Cordless power tools for construction works: what the crew needs on site.",
      ru: "Аккумуляторный электроинструмент для строительных работ: что нужно бригаде на объекте.",
    },
  },
  "catalog/systems": {
    title: {
      en: "Work technologies and stages",
      ru: "Технологии и этапы строительных работ",
    },
    description: {
      en: "Construction work technologies broken down into stages with material and tool consumption rates.",
      ru: "Технологии строительных работ по этапам с нормами расхода материалов и инструмента.",
    },
  },
  "catalog/systems/facade": {
    title: {
      en: "Facade work technologies",
      ru: "Технологии фасадных работ",
    },
    description: {
      en: "Facade technologies by stages: EIFS, scaffolding — materials and tools for each stage.",
      ru: "Фасадные технологии по этапам: мокрый фасад, леса — материалы и инструмент на каждый этап.",
    },
  },
  "catalog/systems/roof": {
    title: {
      en: "Roofing technologies",
      ru: "Технологии кровельных работ",
    },
    description: {
      en: "Roofing technologies by stages with material and tool consumption rates.",
      ru: "Кровельные технологии по этапам с нормами расхода материалов и инструмента.",
    },
  },
  "catalog/systems/interior": {
    title: {
      en: "Interior finishing technologies",
      ru: "Технологии внутренней отделки",
    },
    description: {
      en: "Interior finishing technologies by stages: partitions, surfaces — materials and tools.",
      ru: "Технологии внутренней отделки по этапам: перегородки, поверхности — материалы и инструмент.",
    },
  },
  // Главная для новых посетителей: сценарии со скриншотами (pages/MainPage.vue).
  main: {
    title: {
      en: "Materials and tools for your crew in a minute",
      ru: "Материалы и инструмент для бригады — за минуту",
    },
    description: defaultSeo.description,
  },
  about: {
    title: {
      en: "About the project",
      ru: "О проекте",
    },
    description: {
      en: "Zayávka — a free service for calculating construction materials and tools and making requests for crews.",
      ru: "Zayávka — бесплатный сервис расчёта строительных материалов и инструмента и заявок для бригад.",
    },
  },
};

/**
 * Страницы не для поиска: личные (заявка по id, склады), служебные и расчёт с
 * объёмами в query — у него нет своего содержания без чужих параметров.
 * Имена роутов из router/index.ts.
 */
const NOINDEX_ROUTES = new Set([
  "zayavka",
  "material-list",
  "warehouses",
  "holdings",
  "on-hand",
  "warehouse",
  "auth",
  "catalog-technology",
  "catalog-stage",
  "not-found",
]);

/** Главная — у неё имя сайта впереди заголовка. */
export const HOME_KEY = "zayavka";
/** Язык x-default в hreflang. */
export const DEFAULT_SEO_LOCALE: Locale = "ru";
export const OG_LOCALES: Record<Locale, string> = { ru: "ru_RU", en: "en_US" };

/**
 * Ближайший предок со своим SEO: технология из словаря без ключа
 * (calculator/roof/flat_roof) берёт описание вида работ, а не общее.
 */
export function findSeo(path: string) {
  const segments = path.split("/").slice(2, 6);
  for (let i = segments.length; i > 0; i--) {
    const seo = seoPages[segments.slice(0, i).join("/")];
    if (seo) return seo;
  }
  return defaultSeo;
}

/** Тот же адрес на другой локали: локаль — первый сегмент пути. */
export function withLocale(path: string, locale: Locale) {
  return `${SITE_URL}${path.replace(/^\/[^/]+/, `/${locale}`)}`;
}

/** hreflang: каждая локаль и x-default — одинаково в head, в HTML сборки и в sitemap. */
export function alternateLinks(path: string, locales: readonly Locale[]) {
  return [
    ...locales.map((l) => ({ hreflang: l, href: withLocale(path, l) })),
    { hreflang: "x-default", href: withLocale(path, DEFAULT_SEO_LOCALE) },
  ];
}

export function pageTitle(
  seo: SeoPages[string],
  locale: Locale,
  isHome: boolean,
) {
  return isHome
    ? `${SITE_NAME} — ${seo.title[locale]}`
    : `${seo.title[locale]} — ${SITE_NAME}`;
}

export { seoPages, defaultSeo, notFoundSeo, NOINDEX_ROUTES };

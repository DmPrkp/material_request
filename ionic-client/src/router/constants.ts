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
 * (calculator/facade/EIFS). Каждый ключ — индексируемая страница: из них
 * при сборке строятся sitemap и HTML со своими мета-тегами (seo-prerender.ts).
 * Новый индексируемый роут — просто ключ здесь.
 */
const seoPages: SeoPages = {
  // Список заявок: сюда ведут «Заявки» в меню и переход после входа.
  zayavka: {
    title: {
      en: "Construction material requests by calculation",
      ru: "Заявки на строительные материалы по расчёту",
    },
    description: {
      en: "Material requests built from the calculation: request list, export to a spreadsheet, sending by link and to the company warehouse.",
      ru: "Заявка на строительные материалы по расчёту: список заявок, выгрузка в таблицу, передача по ссылке и на склад компании.",
    },
  },
  calculator: {
    title: {
      en: "Construction materials calculator by type of work",
      ru: "Калькулятор строительных материалов по видам работ",
    },
    description: {
      en: "Online construction materials calculator: choose a type of work — facade, roof, interior — and get materials and tools for your scope.",
      ru: "Онлайн-калькулятор строительных материалов: выберите вид работ — фасад, кровля, отделка — и получите расход материалов и инструмента на ваш объём.",
    },
  },
  "calculator/facade": {
    title: {
      en: "Facade materials calculation: EIFS and scaffolding",
      ru: "Расчёт материалов для фасада: СФТК и строительные леса",
    },
    description: {
      en: "Facade works calculator: EIFS (wet facade) and frame scaffolding — materials, tools and consumption for the facade area.",
      ru: "Калькулятор фасадных работ: мокрый фасад (СФТК) и рамные строительные леса — материалы, инструмент и расход на площадь фасада.",
    },
  },
  "calculator/facade/EIFS": {
    title: {
      en: "EIFS calculator: wet facade materials calculation",
      ru: "Калькулятор мокрого фасада (СФТК): расчёт материалов",
    },
    description: {
      en: "EIFS consumption per 1 m² by stages: insulation adhesive, boards, anchors, mesh, render — plus tools for the crew.",
      ru: "Расход материалов на мокрый фасад СФТК на 1 м² по этапам: клей для утеплителя, утеплитель, дюбели, сетка, штукатурка — и инструмент для бригады.",
    },
  },
  "calculator/facade/frame_scaffold": {
    title: {
      en: "Scaffolding calculation by facade area",
      ru: "Расчёт строительных лесов по площади фасада",
    },
    description: {
      en: "Online frame scaffolding calculator: components for the facade area and tools for assembly.",
      ru: "Онлайн-расчёт рамных строительных лесов: комплектующие на площадь фасада и инструмент для монтажа.",
    },
  },
  "calculator/interior": {
    title: {
      en: "Interior finishing calculation: drywall partitions",
      ru: "Расчёт материалов для отделки: перегородки из гипсокартона",
    },
    description: {
      en: "Interior finishing calculator: drywall partitions and surfaces — materials, tools and consumption for your area.",
      ru: "Калькулятор внутренней отделки: перегородки из гипсокартона и поверхности — материалы, инструмент и расход на вашу площадь.",
    },
  },
  "calculator/interior/GKL_C112": {
    title: {
      en: "Drywall partition calculator (C112)",
      ru: "Калькулятор перегородки из гипсокартона С112",
    },
    description: {
      en: "Online drywall partition calculation: studs, boards, fixings and filler for a C112 partition — single frame, double-layer board on both sides.",
      ru: "Расчёт перегородки из гипсокартона онлайн: профили, ГКЛ, крепёж и шпаклёвка на перегородку С112 — одинарный каркас, двухслойная обшивка.",
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
  // Главная: «/» и «/ru» ведут сюда (router/index.ts, docker/nginx.conf). Сценарии
  // со скриншотами (pages/MainPage.vue). description — до ~160 знаков: длиннее
  // поисковики обрезают.
  // Формулировки здесь и у технологий — по частотам Вордстата (сентябрь 2026):
  // «заявка на материалы» 4318/мес, «расчёт строительных материалов» 1713, «учёт
  // строительных материалов» 1179, «СФТК» 7906 рядом с «мокрый фасад» 24950.
  main: {
    title: {
      en: "Online material requests: materials and tools calculation",
      ru: "Заявка на материалы онлайн: расчёт стройматериалов и инструмента",
    },
    description: {
      en: "Calculate construction materials and tools by consumption rates, make a material request, track materials on site and tools issued. Free.",
      ru: "Расчёт строительных материалов и инструмента по нормам, заявка на материалы, учёт материалов на объекте и выдачи инструмента. Бесплатно.",
    },
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
  "auth-forgot",
  "auth-verify",
  "auth-reset",
  "catalog-technology",
  "catalog-stage",
  "not-found",
]);

/** Главная — у неё имя сайта впереди заголовка и высший приоритет в sitemap. */
export const HOME_KEY = "main";
/** Калькулятор: его виды работ и технологии — в sitemap словаря (seo-prerender.ts). */
export const CALCULATOR_KEY = "calculator";
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

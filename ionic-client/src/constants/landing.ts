import {
  calculatorOutline,
  fileTrayFullOutline,
  layersOutline,
  libraryOutline,
  shareSocialOutline,
} from "ionicons/icons";

/**
 * Сценарии главной (/:locale/main). Тексты — pages.landing.scenarios.<id> в словарях,
 * скриншоты — public/landing/<id>/<шаг>-<локаль>-<тема>.webp. Снимает их
 * scripts/screenshots (шаги там — в том же порядке и того же числа): картинки
 * не рисуются руками, чтобы после правки вёрстки не врать.
 */
export interface LandingScenario {
  id: string;
  icon: string;
  steps: number;
}

export const LANDING_SCENARIOS: LandingScenario[] = [
  { id: "zayavka", icon: calculatorOutline, steps: 3 },
  { id: "transfer", icon: shareSocialOutline, steps: 3 },
  { id: "warehouse", icon: fileTrayFullOutline, steps: 3 },
  { id: "catalog", icon: libraryOutline, steps: 3 },
  { id: "technology", icon: layersOutline, steps: 3 },
];

/**
 * Правила расчёта — pages.landing.method.items.<ключ>. Держатся того, что делает
 * расчёт (calc-server assembleCalc и materialTotal на клиенте): поменялось
 * правило — поправить и текст, иначе главная описывает не то приложение.
 */
export const LANDING_METHOD = [
  { key: "materials", formula: true },
  { key: "tools", formula: true },
  { key: "rounding", formula: false },
  { key: "unfilled", formula: false },
];

/** Свойства хранения и доступа — pages.landing.properties.items.<ключ>. */
export const LANDING_PROPERTIES = [
  "sizes",
  "ownership",
  "anonymous",
  "links",
  "roles",
  "mobile",
];

/** Смена шага в карточке: успеть прочитать подпись и разглядеть экран. */
export const LANDING_STEP_MS = 2800;

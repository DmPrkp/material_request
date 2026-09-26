import { clipboardOutline } from "ionicons/icons";

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
  { id: "zayavka", icon: clipboardOutline, steps: 3 },
];

/** Смена шага в карточке: успеть прочитать подпись и разглядеть экран. */
export const LANDING_STEP_MS = 2800;

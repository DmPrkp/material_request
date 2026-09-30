import BaseCalcModel from "./BaseCalcModel";
import type { CalcOption } from "@/types/dto";

/**
 * Расчёт в calc-server. Пока здесь только параметры технологии: сам расчёт
 * страница материалов отправляет сама — ей нужен свой разбор ошибки.
 */
export default class CalcModel extends BaseCalcModel {
  /**
   * Чем технология умеет различаться: толщина перегородки и подобное. Этапы
   * передаём сами — calc-server технологию не знает, она живёт в словаре.
   * Пустой список — параметров нет, выбирать нечего.
   */
  static options(system: string, stageIds: number[]) {
    if (!stageIds.length) return Promise.resolve<CalcOption[]>([]);
    return this.get<CalcOption[]>(
      `/calc/${system}/options?stages=${stageIds.join(",")}`
    );
  }
}

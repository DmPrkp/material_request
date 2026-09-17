import BaseCalcModel from "./BaseCalcModel";
import type { StageNorms, StageNormsInput } from "@/types/dto";

/**
 * Нормы расхода этапа в calc-server. Чтение открыто; запись — с токеном, и права
 * calc-server берёт у словаря по технологии этапа: чужая общая технология правится
 * только в копии, иначе 403.
 */
export default class NormsModel extends BaseCalcModel {
  static byStage(stageId: number) {
    return this.get<StageNorms>(`/norms/stages/${stageId}`);
  }

  /** Набор заменяется целиком: чего нет в теле — удаляется. */
  static replace(stageId: number, body: StageNormsInput) {
    return this.put<StageNorms>({
      params: `/norms/stages/${stageId}`,
      body,
    });
  }

  /** Нормы этапа оригинала — на этап копии технологии. Повторный вызов ничего не задваивает. */
  static copyFrom(stageId: number, sourceStageId: number) {
    return this.post<StageNorms>({
      params: `/norms/stages/${stageId}/copy-from/${sourceStageId}`,
    });
  }
}

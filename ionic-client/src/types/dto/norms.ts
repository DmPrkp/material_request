/**
 * Нормы расхода этапа работ — живут в calc-server (его база, без FK в словарь).
 *
 * ref — код сборки материала или ручного инструмента ('8:208:243'), а у
 * электроинструмента сборок нет: там id самой позиции. Код меняется вместе с
 * параметрами сборки, поэтому норма от прежнего типоразмера просто не найдётся —
 * вместо того чтобы молча достаться другому.
 *
 * rate материала — на единицу объёма технологии (м²), rate инструмента — штук на
 * одно звено бригады: расчёт умножает его на crew — число звеньев, не людей
 * (бригада из 20 человек — это 4 звена по 5).
 * Примечаний по полю на язык: calc-server сам ничего не переводит.
 */
export type StageNorm = {
  id: number;
  ref: string | number;
  rate: number;
  noteRu: string | null;
  noteEn: string | null;
};

export type NormKind = "materials" | "handTools" | "powerTools";

export type StageNorms = Record<NormKind, StageNorm[]> & { stageId: number };

export type StageNormsInput = Record<NormKind, Omit<StageNorm, "id">[]>;

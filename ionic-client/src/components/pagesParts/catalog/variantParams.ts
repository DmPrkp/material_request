import type { VariantParamInput } from "@/models/DictionaryModel";
import type { DictionaryVariantParam } from "@/types/dto";

/**
 * Строки параметров сборки в формах (новый инструмент, сборка).
 *
 * Сборка (бывш. assembled_hand_tools, code вида 7:227:333) — базовая позиция плюс
 * набор значений параметров; без параметров code вырождается в id позиции ('7').
 * Форма работает тройками «вид, единица, значение», id значения подбирает словарь.
 */

/** «Без вида» в селекте: ion-select не умеет null в значении — 0, id с нуля не начинаются. */
export const NO_KIND = 0;

export type ParamRow = {
  /** Ключ v-for: строки убираются из середины. */
  key: number;
  kindId: number;
  unitId: number | null;
  /** Строкой, как в поле ввода: '6', '0.5'. */
  value: string;
};

let seq = 0;

export function newRow(unitId: number | null = null): ParamRow {
  return { key: seq++, kindId: NO_KIND, unitId, value: "" };
}

/** '6.0000' из базы и '6' из поля — одно значение; мусор остаётся как есть. */
export function normalize(value: unknown): string {
  const text = String(value ?? "").trim();
  const number = Number(text);
  return text && Number.isFinite(number) ? String(number) : text;
}

export function rowFromParam(param: DictionaryVariantParam): ParamRow {
  return {
    key: seq++,
    kindId: param.kindId ?? NO_KIND,
    unitId: param.unitId,
    value: normalize(param.value),
  };
}

export function toInput(row: ParamRow): VariantParamInput {
  return {
    kindId: row.kindId === NO_KIND ? null : row.kindId,
    unitId: row.unitId ?? 0,
    value: Number(normalize(row.value)),
  };
}

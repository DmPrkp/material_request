import { useI18n } from "vue-i18n";
import type { DictionaryUnit } from "@/types/dto";

/**
 * Короткая подпись единицы: «м²», «шт», а не «кв. метр».
 *
 * Короткие формы живут в i18n (measure.<code>) — словарь отдаёт только полное
 * название. Нет ключа (единицу завели недавно) — полное название из словаря,
 * а не голый код.
 */
export function useUnitLabel() {
  const { t, te } = useI18n({ useScope: "global" });
  return (unit: Pick<DictionaryUnit, "code" | "name">): string =>
    te(`measure.${unit.code}`) ? t(`measure.${unit.code}`) : unit.name;
}

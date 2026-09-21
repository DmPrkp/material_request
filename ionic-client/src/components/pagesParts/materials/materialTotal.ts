import { Material } from "@/types/dto";

/**
 * Расход на м² хранится с 4 знаками: нормы бывают вида 0.005 шт/м², и прежние
 * 2 знака превращали их в 0.01 — вдвое больше, а 0.0001 — в ноль.
 */
export function roundConsumption(value: number): number {
  return Number(value.toFixed(4));
}

/**
 * Штучное — и в коде единицы (данные из расчёта), и в подписи: в калькуляторе
 * MaterialList переводит measure, и в заявку оно уходит уже «шт» или «pcs».
 */
const PIECES = new Set(["pcs", "шт"]);

/**
 * Общий расход строки. Штучное — вверх до целого: 919.9 бура не купить, нужно 920.
 * Остальное (кг, л, м) — два знака. Сначала срезаем шум float: 0.07 × 100 даёт
 * 7.000000000000001, и ceil без этого насчитал бы 8.
 */
export function materialTotal(
  material: Pick<Material, "consumption" | "volume" | "measure">,
): number {
  const total = Number((material.consumption * material.volume).toFixed(6));
  return PIECES.has(material.measure)
    ? Math.ceil(total)
    : Number(total.toFixed(2));
}

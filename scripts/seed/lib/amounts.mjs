/**
 * Правдоподобные числа по единице материала: расход на единицу объёма (как норма в
 * заявке) и запас на складе. Сотни килограммов гвоздей на м² заявку не красят.
 */
const CONSUMPTION = {
  pcs: [0.1, 6, 2],
  kg: [0.2, 8, 2],
  l: [0.1, 1.5, 3],
  m: [0.3, 4, 2],
  m2: [1, 1.15, 2],
};

const STOCK = {
  pcs: [5, 500, 0],
  kg: [25, 1000, 0],
  l: [5, 200, 0],
  m: [10, 300, 0],
  m2: [20, 400, 0],
};

export const consumption = (random, unit) => random.float(...(CONSUMPTION[unit] ?? [0.1, 5, 2]));

export const stock = (random, unit) => random.float(...(STOCK[unit] ?? [1, 100, 0]));

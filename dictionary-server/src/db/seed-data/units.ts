/** Единицы измерения. */
type Unit = { id: number; code: string; nameRu: string; nameEn: string };

export const units: Unit[] = [
  { id: 1, code: 'm', nameRu: 'метр', nameEn: 'meter' },
  { id: 2, code: 'cm', nameRu: 'сантиметр', nameEn: 'centimeter' },
  { id: 3, code: 'mm', nameRu: 'миллиметр', nameEn: 'millimeter' },
  { id: 4, code: 'g', nameRu: 'грамм', nameEn: 'gram' },
  { id: 5, code: 'kg', nameRu: 'килограмм', nameEn: 'kilogram' },
  { id: 6, code: 'l', nameRu: 'литр', nameEn: 'liter' },
  { id: 7, code: 'm2', nameRu: 'кв. метр', nameEn: 'square meter' },
  { id: 8, code: 'pcs', nameRu: 'штука', nameEn: 'piece' },
  { id: 9, code: 'v', nameRu: 'вольт', nameEn: 'volt' },
];

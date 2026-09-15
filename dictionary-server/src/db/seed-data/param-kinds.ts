/** Виды параметров: длина, диаметр, напряжение. */
type ParamKind = { id: number; code: string; nameRu: string; nameEn: string };

export const paramKinds: ParamKind[] = [
  { id: 1, code: 'length', nameRu: 'длина', nameEn: 'length' },
  { id: 2, code: 'weight', nameRu: 'вес', nameEn: 'weight' },
  { id: 3, code: 'width', nameRu: 'ширина', nameEn: 'width' },
  { id: 4, code: 'height', nameRu: 'высота', nameEn: 'height' },
  { id: 5, code: 'depth', nameRu: 'глубина', nameEn: 'depth' },
  { id: 6, code: 'diameter', nameRu: 'диаметр', nameEn: 'diameter' },
  { id: 7, code: 'volume', nameRu: 'объём', nameEn: 'volume' },
  { id: 8, code: 'area', nameRu: 'площадь', nameEn: 'area' },
  { id: 9, code: 'density', nameRu: 'плотность', nameEn: 'density' },
  { id: 10, code: 'thickness', nameRu: 'толщина', nameEn: 'thickness' },
  { id: 11, code: 'voltage', nameRu: 'напряжение', nameEn: 'voltage' },
  { id: 12, code: 'size', nameRu: 'размер', nameEn: 'size' },
];

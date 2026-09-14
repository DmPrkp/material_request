/**
 * Виды работ — верхний уровень над технологиями (systems).
 *
 * code совпадает с разделами главного меню клиента (src/constants/menu.ts): по нему
 * клиент подбирает картинку плитки. У нового вида картинки нет — рисуется иконка.
 */
type WorkType = { id: number; code: string; nameRu: string; nameEn: string };

export const workTypes: WorkType[] = [
  { "id": 1, "code": "facade", "nameRu": "Фасад", "nameEn": "Facade" },
  { "id": 2, "code": "roof", "nameRu": "Кровля", "nameEn": "Roof" },
  { "id": 3, "code": "interior", "nameRu": "Внутренняя отделка", "nameEn": "Interior finishing" },
];

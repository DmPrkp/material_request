/**
 * Типы материалов.
 *
 * Связь у материала необязательная — тип может отсутствовать.
 * Список пополняется: заливка сверяется по `code` и добавляет недостающие.
 */
type MaterialType = { id: number; code: string; nameRu: string; nameEn: string };

export const materialTypes: MaterialType[] = [
  { id: 1, code: 'insulation', nameRu: 'Теплоизоляция', nameEn: 'Thermal insulation' },
  { id: 2, code: 'dry_mix', nameRu: 'Сухие смеси', nameEn: 'Dry mixes' },
  { id: 3, code: 'paint', nameRu: 'Лакокрасочные материалы', nameEn: 'Paints and coatings' },
  { id: 4, code: 'reinforcement', nameRu: 'Армирматура', nameEn: 'Reinforcement' },
  { id: 5, code: 'profile', nameRu: 'Профили', nameEn: 'Profiles' },
  { id: 6, code: 'fastener', nameRu: 'Крепёж', nameEn: 'Fasteners' },
  { id: 7, code: 'timber', nameRu: 'Пиломатериалы', nameEn: 'Timber' },
  { id: 8, code: 'scaffolding', nameRu: 'Строительные леса', nameEn: 'Scaffolding' },
  { id: 9, code: 'sealant', nameRu: 'Герметики', nameEn: 'Sealants' },
  { id: 10, code: 'tooling', nameRu: 'Оснастка', nameEn: 'Tooling' },
  { id: 11, code: 'ppe', nameRu: 'СИЗ', nameEn: 'Personal protective equipment' },
  { id: 12, code: 'consumable', nameRu: 'Расходники', nameEn: 'Consumables' },
];

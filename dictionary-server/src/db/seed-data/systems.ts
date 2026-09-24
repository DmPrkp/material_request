/**
 * Технологии работ; workTypeId — вид работ из work-types.ts (все нынешние — фасад).
 *
 * title — технический код: по нему ходят calc-server (/:workType/:system) и ключи
 * i18n калькулятора, поэтому менять его нельзя. Людям показывается name.
 */
type System = {
  id: number;
  title: string;
  nameRu: string;
  nameEn: string | null;
  descriptionRu: string | null;
  descriptionEn: string | null;
  workTypeId: number;
  /** Единица объёма работ (units.ts): калькулятор подписывает ею поля. */
  unitId: number;
};

export const systems: System[] = [
  {
    id: 1,
    title: 'EIFS',
    nameRu: 'Мокрый фасад',
    nameEn: 'EIFS',
    descriptionRu: 'Системы фасадные теплоизоляционные с тонким штукатурным слоем',
    descriptionEn: 'Exterior insulation finishing systems',
    workTypeId: 1,
    unitId: 7,
  },
  {
    id: 2,
    title: 'frame_scaffold',
    nameRu: 'Рамные строительные леса ячейка 2х3м',
    nameEn: 'Frame scaffold set 2x3m',
    descriptionRu: 'Рамные строительные леса',
    descriptionEn: 'frame scaffold system',
    workTypeId: 1,
    unitId: 7,
  },
];

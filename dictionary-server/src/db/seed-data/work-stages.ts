/**
 * Этапы работ внутри системы; position — порядок слоя.
 * title — технический код (ключ i18n калькулятора), людям — nameRu / nameEn.
 */
type WorkStage = {
  id: number;
  title: string;
  nameRu: string;
  nameEn: string | null;
  systemId: number;
  position: number;
};

export const workStages: WorkStage[] = [
  {
    id: 1,
    title: 'surface preparation',
    nameRu: 'Подготовка поверхности',
    nameEn: 'Surface preparation',
    systemId: 1,
    position: 1,
  },
  {
    id: 2,
    title: 'insulation coat',
    nameRu: 'Слой теплоизоляции',
    nameEn: 'Insulation coat',
    systemId: 1,
    position: 2,
  },
  {
    id: 3,
    title: 'fiberglass mesh',
    nameRu: 'Армирующий клеевой слой',
    nameEn: 'Fiberglass mesh',
    systemId: 1,
    position: 3,
  },
  { id: 4, title: 'finish coat', nameRu: 'Финишный слой', nameEn: 'Finish coat', systemId: 1, position: 4 },
  { id: 5, title: 'paint layer', nameRu: 'Окрасочный слой', nameEn: 'Paint layer', systemId: 1, position: 5 },
  {
    id: 6,
    title: 'scaffolding installation',
    nameRu: 'Монтаж лесов',
    nameEn: 'Scaffolding installation',
    systemId: 2,
    position: 1,
  },
  {
    id: 7,
    title: 'fastening scaffolding',
    nameRu: 'Крепление лесов к фасаду',
    nameEn: 'Fastening scaffolding to the facade',
    systemId: 2,
    position: 2,
  },
];

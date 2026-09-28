/**
 * Гибкая (битумная) черепица — скатная кровля по сплошному основанию.
 *
 * Отдельным файлом и отдельным шагом сидов, как c112.ts: шаги отмечаются в
 * seed_history поштучно, поэтому новый шаг доезжает до уже залитой базы, а
 * дописанное в старый массив — нет.
 *
 * Нормы — гибрид, и это осознанно. Гибкая черепица пришла из США, и подробные
 * правила подсчёта есть именно там: NRCA даёт запас на подрезку (10% простая
 * двускатная, 15% вальмовая и сложная), ARMA — раскладку пачек (3 пачки на
 * square = 9,29 м², то есть ~8,6 гонта на м²), производители — схему крепления
 * (4 гвоздя на гонт, 6 в ветровой зоне и на крутых скатах). ГЭСН 12-01-007-07
 * («кровли из полосной битумной черепицы по сплошной обшивке») нормирует то же
 * на 100 м², но короче: черепица 1,04 м²/м², гвозди 0,068 кг/м², плюс 0,52 кг/м²
 * оцинкованной стали на всю жестяную обвязку — подкладочного ковра, мастики и
 * аэраторов там нет вовсе.
 *
 * Поэтому: американские числа как основа (запас там больше и разложен по типам
 * кровли), ГЭСН — сверкой в примечаниях. Складывать их нельзя: ГЭСН уже включает
 * трудноустранимые потери, а waste factor у NRCA идёт поверх чистого расхода.
 *
 * Всё, что считается по погонным метрам (карнизы, фронтоны, ендовы, конёк,
 * примыкания), зависит от геометрии крыши, а не от её площади. Такие позиции
 * заведены с нормой 0 и примечанием: количество ставит пользователь.
 *
 * Нормы лежат в calc-server (src/module.db/seed/007-shingles_norms.seed.sql) и
 * ссылаются сюда кодами сборок, поэтому id проставлены явно.
 */

type ParamValue = { id: number; kindId: number | null; value: number; unitId: number };
type MaterialType = { id: number; code: string; nameRu: string; nameEn: string };
type Material = {
  id: number;
  nameEn: string;
  nameRu: string;
  descriptionEn: string | null;
  descriptionRu: string | null;
  unitId: number;
  typeId: number | null;
};
type MaterialVariant = { id: number; materialId: number; paramValueIds: number[] };
type System = {
  id: number;
  title: string;
  nameRu: string;
  nameEn: string | null;
  descriptionRu: string | null;
  descriptionEn: string | null;
  workTypeId: number;
  unitId: number;
};
type WorkStage = {
  id: number;
  title: string;
  nameRu: string;
  nameEn: string | null;
  systemId: number;
  position: number;
};

/** Уникальность значений — по тройке (вид, число, единица), отсюда отдельные строки. */
export const shinglesParamValues: ParamValue[] = [
  { id: 256, kindId: 6, value: 3, unitId: 3 }, // Ø 3 мм — кровельный гвоздь
  { id: 257, kindId: 1, value: 30, unitId: 3 }, // длина 30 мм — он же
  { id: 533, kindId: 10, value: 9, unitId: 3 }, // толщина 9 мм — ОСП
  { id: 534, kindId: 10, value: 12, unitId: 3 }, // толщина 12 мм — ОСП
];

export const shinglesMaterialTypes: MaterialType[] = [
  { id: 14, code: 'roofing', nameRu: 'Кровельные материалы', nameEn: 'Roofing materials' },
];

export const shinglesMaterials: Material[] = [
  {
    id: 110,
    nameEn: 'OSB-3 board',
    nameRu: 'Плита ОСП-3',
    descriptionEn: 'Continuous deck under flexible shingles',
    descriptionRu: 'Сплошное основание под гибкую черепицу',
    unitId: 7,
    typeId: 13,
  },
  {
    id: 111,
    nameEn: 'Wood screw',
    nameRu: 'Саморез по дереву',
    descriptionEn: 'Fixing the deck to the rafters',
    descriptionRu: 'Крепление настила к стропилам и обрешётке',
    unitId: 8,
    typeId: 6,
  },
  {
    id: 112,
    nameEn: 'Roofing underlayment',
    nameRu: 'Подкладочный ковёр',
    descriptionEn: 'Rolled underlayment beneath the shingles',
    descriptionRu: 'Рулонный ковёр под черепицу, по всему скату',
    unitId: 7,
    typeId: 14,
  },
  {
    id: 113,
    nameEn: 'Asphalt shingles',
    nameRu: 'Гибкая черепица',
    descriptionEn: 'Bituminous strip shingles',
    descriptionRu: 'Битумная полосная черепица (гонты)',
    unitId: 7,
    typeId: 14,
  },
  {
    id: 114,
    nameEn: 'Hip and ridge shingles',
    nameRu: 'Коньково-карнизная черепица',
    descriptionEn: 'For ridges, hips and the starter course at the eaves',
    descriptionRu: 'На конёк, рёбра и стартовую полосу по карнизу',
    unitId: 1,
    typeId: 14,
  },
  {
    id: 115,
    nameEn: 'Valley underlayment',
    nameRu: 'Ендовый ковёр',
    descriptionEn: 'Reinforcing carpet in valleys and at abutments',
    descriptionRu: 'Усиливающий ковёр в ендовах и примыканиях',
    unitId: 7,
    typeId: 14,
  },
  {
    id: 116,
    nameEn: 'Roofing nail',
    nameRu: 'Гвоздь кровельный',
    descriptionEn: 'Wide-head nail for shingles and underlayment',
    descriptionRu: 'Гвоздь с широкой шляпкой для черепицы и ковра',
    unitId: 8,
    typeId: 6,
  },
  {
    id: 117,
    nameEn: 'Bituminous mastic',
    nameRu: 'Мастика битумная',
    descriptionEn: 'Sealing laps, valleys and abutments',
    descriptionRu: 'Проклейка нахлёстов, ендов и примыканий',
    unitId: 5,
    typeId: 9,
  },
  {
    id: 118,
    nameEn: 'Eaves drip edge',
    nameRu: 'Планка карнизная',
    descriptionEn: 'Metal drip edge along the eaves',
    descriptionRu: 'Металлическая капельная планка по карнизу',
    unitId: 1,
    typeId: 5,
  },
  {
    id: 119,
    nameEn: 'Rake edge',
    nameRu: 'Планка фронтонная',
    descriptionEn: 'Metal edge along the gable rake',
    descriptionRu: 'Металлическая планка по фронтонному свесу',
    unitId: 1,
    typeId: 5,
  },
  {
    id: 120,
    nameEn: 'Roof vent',
    nameRu: 'Аэратор кровельный',
    descriptionEn: 'Ventilates the underlayment space',
    descriptionRu: 'Вентиляция подкровельного пространства',
    unitId: 8,
    typeId: 14,
  },
];

export const shinglesMaterialVariants: MaterialVariant[] = [
  { id: 700, materialId: 110, paramValueIds: [534] }, // ОСП-3 12 мм
  { id: 701, materialId: 110, paramValueIds: [533] }, // ОСП-3 9 мм
  { id: 710, materialId: 111, paramValueIds: [225, 247] }, // саморез 3,5×40
  { id: 720, materialId: 112, paramValueIds: [] },
  { id: 730, materialId: 113, paramValueIds: [] },
  { id: 740, materialId: 114, paramValueIds: [] },
  { id: 750, materialId: 115, paramValueIds: [] },
  { id: 760, materialId: 116, paramValueIds: [256, 257] }, // гвоздь кровельный 3×30
  { id: 770, materialId: 117, paramValueIds: [] },
  { id: 780, materialId: 118, paramValueIds: [] },
  { id: 790, materialId: 119, paramValueIds: [] },
  { id: 800, materialId: 120, paramValueIds: [] },
];

export const shinglesSystems: System[] = [
  {
    id: 4,
    title: 'shingles',
    nameRu: 'Гибкая черепица',
    nameEn: 'Flexible shingles',
    descriptionRu: 'Скатная кровля из битумной черепицы по сплошному основанию',
    descriptionEn: 'Pitched roof of bituminous shingles over a continuous deck',
    workTypeId: 2,
    unitId: 7,
  },
];

/**
 * Этапы — слоями кровельного пирога, снизу вверх. Объём каждого — площадь ската;
 * карнизы, ендовы и конёк площадью не считаются, поэтому собраны в свои этапы,
 * где нормы нулевые и количество ставит пользователь.
 */
export const shinglesWorkStages: WorkStage[] = [
  { id: 20, title: 'shingles deck', nameRu: 'Сплошное основание', nameEn: 'Deck', systemId: 4, position: 1 },
  {
    id: 21,
    title: 'shingles underlayment',
    nameRu: 'Подкладочный ковёр',
    nameEn: 'Underlayment',
    systemId: 4,
    position: 2,
  },
  {
    id: 22,
    title: 'shingles edges',
    nameRu: 'Карнизы, фронтоны, ендовы',
    nameEn: 'Edges and valleys',
    systemId: 4,
    position: 3,
  },
  {
    id: 23,
    title: 'shingles field',
    nameRu: 'Укладка черепицы',
    nameEn: 'Shingle field',
    systemId: 4,
    position: 4,
  },
  {
    id: 24,
    title: 'shingles ridge',
    nameRu: 'Конёк и вентиляция',
    nameEn: 'Ridge and ventilation',
    systemId: 4,
    position: 5,
  },
];

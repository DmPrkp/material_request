/**
 * Перегородка из газобетонных блоков на тонкошовном клее.
 *
 * Отдельным файлом и шагом сидов, как c112.ts, shingles.ts и metal-tile.ts.
 *
 * Толщина здесь — параметр расчёта (calc-server, миграция 002): 80, 100 и 150 мм.
 * Значения параметров под них уже есть (526, 527, 529 — толщина в мм), заводить
 * нечего. В отличие от С112, где от толщины менялся только типоразмер профиля,
 * тут от неё зависит сам расход: блоки и клей нормируются на кубометр кладки.
 * Поэтому нормы на них помечены «на кубометр» (миграция 003) — расчёт умножает их
 * на выбранную толщину, и одна строка клея покрывает все толщины сразу.
 *
 * Новая единица — кубометр: раньше её не было, потому что всё считалось площадью,
 * погонными метрами и штуками. Блок продают и нормируют кубами, поэтому m3.
 *
 * Перемычки над проёмами тут же, отдельным этапом: решений три и они
 * взаимоисключающие — заводская армированная перемычка (есть на 100 и 150 мм),
 * стальной уголок полкой вверх (проёмы примерно до метра и единственный вариант
 * при толщине 80) и монолитная в съёмной опалубке. U-образные блоки не заводим:
 * их делают от 200 мм, для перегородок их нет.
 *
 * Нормы — calc-server (src/module.db/seed/010-aerated_concrete_norms.seed.sql),
 * ссылаются сюда кодами сборок, поэтому id проставлены явно.
 */

type ParamValue = { id: number; kindId: number | null; value: number; unitId: number };
type Unit = { id: number; code: string; nameRu: string; nameEn: string };
type MaterialType = { id: number; code: string; nameRu: string; nameEn: string };
type HandTool = { id: number; nameEn: string; nameRu: string };
type HandToolVariant = { id: number; handToolId: number; paramValueIds: number[] };
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

/**
 * Полки уголка: равнополочный обозначают двумя числами (50×50), поэтому ширина и
 * высота. Толщины 50 и 100 в ширине уже есть (504, 507), остального не было.
 */
export const aeratedParamValues: ParamValue[] = [
  { id: 906, kindId: 3, value: 70, unitId: 3 }, // ширина 70 мм
  { id: 907, kindId: 4, value: 50, unitId: 3 }, // высота 50 мм
  { id: 908, kindId: 4, value: 70, unitId: 3 },
  { id: 909, kindId: 4, value: 100, unitId: 3 },
];

export const aeratedUnits: Unit[] = [{ id: 10, code: 'm3', nameRu: 'куб. метр', nameEn: 'cubic meter' }];

export const aeratedMaterialTypes: MaterialType[] = [
  { id: 15, code: 'masonry', nameRu: 'Кладочные материалы', nameEn: 'Masonry materials' },
];

/**
 * Инструмент каменщика по газобетону: обычными ножовкой и рубанком блок не пилят
 * и не ровняют — зубья и полотно нужны твердосплавные, иначе садятся за пару резов.
 */
export const aeratedHandTools: HandTool[] = [
  { id: 36, nameEn: 'glue carriage', nameRu: 'каретка для клея' },
  { id: 37, nameEn: 'handsaw for aerated concrete', nameRu: 'ножовка по газобетону' },
  { id: 38, nameEn: 'rubber mallet', nameRu: 'киянка резиновая' },
  { id: 39, nameEn: 'float for aerated concrete', nameRu: 'тёрка по газобетону' },
  { id: 40, nameEn: 'foam gun', nameRu: 'пистолет для монтажной пены' },
];

/** Типоразмеров у этого инструмента нет — сборка без параметров, код это id позиции. */
export const aeratedHandToolVariants: HandToolVariant[] = [
  { id: 360, handToolId: 36, paramValueIds: [] },
  { id: 370, handToolId: 37, paramValueIds: [] },
  { id: 380, handToolId: 38, paramValueIds: [] },
  { id: 390, handToolId: 39, paramValueIds: [] },
  { id: 400, handToolId: 40, paramValueIds: [] },
];

export const aeratedMaterials: Material[] = [
  {
    id: 130,
    nameEn: 'Aerated concrete block',
    nameRu: 'Блок газобетонный',
    descriptionEn: 'Autoclaved block 600x250 mm, D500, for partitions',
    descriptionRu: 'Автоклавный блок 600×250 мм, D500, для перегородок',
    unitId: 10,
    typeId: 15,
  },
  {
    id: 131,
    nameEn: 'Thin-bed masonry adhesive',
    nameRu: 'Клей для газобетонных блоков',
    descriptionEn: 'Dry mix for thin-bed joints of 1-3 mm',
    descriptionRu: 'Сухая смесь для тонкого шва 1–3 мм',
    unitId: 5,
    typeId: 2,
  },
  {
    id: 132,
    nameEn: 'Perforated wall tie',
    nameRu: 'Связь гибкая перфорированная',
    descriptionEn: 'Galvanised strip tying the partition to the structure',
    descriptionRu: 'Оцинкованная полоса: крепление перегородки к несущим стенам',
    unitId: 8,
    typeId: 6,
  },
  {
    id: 133,
    nameEn: 'Polyurethane foam',
    nameRu: 'Пена монтажная профессиональная',
    descriptionEn: 'Seals the gap under the slab above the partition',
    descriptionRu: 'Зазор под перекрытием над перегородкой',
    unitId: 8,
    typeId: 9,
  },
  {
    id: 134,
    nameEn: 'Masonry reinforcing mesh',
    nameRu: 'Сетка кладочная оцинкованная',
    descriptionEn: 'Laid in horizontal joints where the design calls for it',
    descriptionRu: 'В горизонтальные швы, если требует проект',
    unitId: 1,
    typeId: 4,
  },
  {
    id: 135,
    nameEn: 'Reinforced aerated concrete lintel',
    nameRu: 'Перемычка газобетонная армированная',
    descriptionEn: 'Factory lintel laid on adhesive, bearing at least 250 mm each side',
    descriptionRu: 'Заводская перемычка на клею, опирание не менее 250 мм с каждой стороны',
    unitId: 8,
    typeId: 15,
  },
  {
    id: 136,
    nameEn: 'Steel equal angle',
    nameRu: 'Уголок стальной равнополочный',
    descriptionEn: 'Laid flange up over narrow openings; sized by the opening',
    descriptionRu: 'Укладывается полкой вверх над узкими проёмами; типоразмер — по ширине проёма',
    unitId: 1,
    typeId: 5,
  },
  {
    id: 137,
    nameEn: 'Rebar A500C',
    nameRu: 'Арматура А500С',
    descriptionEn: 'For a cast-in-place lintel',
    descriptionRu: 'В монолитную перемычку',
    unitId: 1,
    typeId: 4,
  },
  {
    id: 138,
    nameEn: 'Cement-sand mix',
    nameRu: 'Смесь цементно-песчаная (ЦПС)',
    descriptionEn: 'Fills the lintel formwork',
    descriptionRu: 'Заполнение перемычки',
    unitId: 5,
    typeId: 2,
  },
];

/** Толщина блока — она же параметр расчёта: 526 — 80 мм, 527 — 100 мм, 529 — 150 мм. */
export const aeratedMaterialVariants: MaterialVariant[] = [
  { id: 900, materialId: 130, paramValueIds: [526] },
  { id: 901, materialId: 130, paramValueIds: [527] },
  { id: 902, materialId: 130, paramValueIds: [529] },
  { id: 910, materialId: 131, paramValueIds: [] },
  { id: 920, materialId: 132, paramValueIds: [] },
  { id: 930, materialId: 133, paramValueIds: [] },
  { id: 940, materialId: 134, paramValueIds: [] },
  // Заводская перемычка — по толщине перегородки, как и блок.
  { id: 950, materialId: 135, paramValueIds: [527] },
  { id: 951, materialId: 135, paramValueIds: [529] },
  { id: 960, materialId: 136, paramValueIds: [504, 907] }, // уголок 50×50
  { id: 961, materialId: 136, paramValueIds: [906, 908] }, // 70×70
  { id: 962, materialId: 136, paramValueIds: [507, 909] }, // 100×100
  { id: 970, materialId: 137, paramValueIds: [208] },
  { id: 980, materialId: 138, paramValueIds: [] },
];

export const aeratedSystems: System[] = [
  {
    id: 6,
    title: 'aerated_concrete',
    // Людям — простое название: «перегородки» сказаны уровнем выше, группой на клиенте.
    nameRu: 'Газобетон',
    nameEn: 'Aerated concrete',
    descriptionRu: 'Перегородка из газобетонных блоков на тонкошовном клее',
    descriptionEn: 'Partition of aerated concrete blocks on thin-bed adhesive',
    workTypeId: 3,
    unitId: 7,
  },
];

/**
 * Объём этапов — площадь перегородки, как у С112: пользователь вводит м², а кубы
 * расчёт получает сам, умножая нормы «на кубометр» на выбранную толщину.
 *
 * Перемычки и примыкания вынесены в свои этапы: там всё считается по числу проёмов,
 * длине примыканий и высоте, а не по площади, поэтому нормы нулевые и количество
 * ставит пользователь.
 */
export const aeratedWorkStages: WorkStage[] = [
  { id: 40, title: 'aerated layout', nameRu: 'Разметка', nameEn: 'Layout', systemId: 6, position: 1 },
  {
    id: 41,
    title: 'aerated masonry',
    nameRu: 'Кладка блоков',
    nameEn: 'Block laying',
    systemId: 6,
    position: 2,
  },
  {
    id: 43,
    title: 'aerated lintels',
    nameRu: 'Перемычки над проёмами',
    nameEn: 'Lintels over openings',
    systemId: 6,
    position: 3,
  },
  {
    id: 42,
    title: 'aerated junctions',
    nameRu: 'Крепление и примыкания',
    nameEn: 'Ties and junctions',
    systemId: 6,
    position: 4,
  },
];

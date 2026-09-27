/**
 * Металлочерепица — скатная кровля по разреженной обрешётке.
 *
 * Отдельным файлом и шагом сидов, как c112.ts и shingles.ts.
 *
 * Здесь основа — ГЭСН 12-01-020-01 «Устройство кровель различных типов из
 * металлочерепицы» (100 м²), а не американские источники: металлочерепица —
 * европейский и российский продукт, в США вместо неё фальцевая кровля и
 * металлический шингл, и правила подсчёта там про другое изделие. Норма ГЭСН
 * покрывает весь пирог разом — плёнку, контробрешётку, обрешётку, листы, крепёж,
 * герметик и подкладку под конёк, — чего не было у гибкой черепицы.
 *
 * Пересчёт на 1 м²: расход ГЭСН делится на 100. Пиломатериалы ГЭСН даёт в м³, а
 * справочник считает их штуками по сечению и длине, поэтому объём пересчитан на
 * выбранную сборку (доска 100×40 и брусок 50×50 по 6 м). Крепёж ГЭСН даёт в тоннах —
 * переведён в штуки по массе гвоздя из ГОСТ 4028 (4×100 — около 9,8 г; 3×40 — 2,2 г).
 *
 * Доборные элементы в ГЭСН стоят как «по проекту»: их длина зависит от геометрии
 * крыши, а не от площади ската. Такие позиции заведены с нормой 0 — количество
 * ставит пользователь.
 *
 * Нормы — calc-server (src/module.db/seed/008-metal_tile_norms.seed.sql), ссылаются
 * сюда кодами сборок, поэтому id проставлены явно.
 */

type ParamValue = { id: number; kindId: number | null; value: number; unitId: number };
type PowerTool = { id: number; nameEn: string; nameRu: string; isCorded: boolean };
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

export const metalTileParamValues: ParamValue[] = [
  { id: 258, kindId: 6, value: 4.8, unitId: 3 }, // Ø 4,8 мм — кровельный саморез
  { id: 259, kindId: 1, value: 19, unitId: 3 }, // длина 19 мм — он же, для доборных
  { id: 260, kindId: 6, value: 4, unitId: 3 }, // Ø 4 мм — строительный гвоздь
];

/** ГЭСН на эту кровлю считает электроножницы; болгарка тут не годится — жжёт покрытие. */
export const metalTilePowerTools: PowerTool[] = [
  { id: 27, nameEn: 'electric metal shears', nameRu: 'ножницы электрические по металлу', isCorded: true },
];

export const metalTileMaterials: Material[] = [
  {
    id: 121,
    nameEn: 'Metal tile sheet',
    nameRu: 'Металлочерепица',
    descriptionEn: 'Profiled steel sheet with a polymer coating',
    descriptionRu: 'Профилированный стальной лист с полимерным покрытием',
    unitId: 7,
    typeId: 14,
  },
  {
    id: 122,
    nameEn: 'Roofing membrane',
    nameRu: 'Плёнка гидроизоляционная подкровельная',
    descriptionEn: 'Laid over the rafters under the counter battens',
    descriptionRu: 'Укладывается по стропилам под контробрешётку',
    unitId: 7,
    typeId: 14,
  },
  {
    id: 123,
    nameEn: 'Roofing screw with EPDM washer',
    nameRu: 'Саморез кровельный с прессшайбой',
    descriptionEn: 'Hex-head screw with an EPDM sealing washer',
    descriptionRu: 'Шуруп с шестигранной головкой и уплотнительной шайбой ЭПДМ',
    unitId: 8,
    typeId: 6,
  },
  {
    id: 124,
    nameEn: 'Galvanised construction nail',
    nameRu: 'Гвоздь строительный оцинкованный',
    descriptionEn: 'Fixing the battens and counter battens',
    descriptionRu: 'Крепление обрешётки и контробрешётки',
    unitId: 8,
    typeId: 6,
  },
  {
    id: 125,
    nameEn: 'Ridge flashing',
    nameRu: 'Планка конька',
    descriptionEn: 'Covers the ridge line',
    descriptionRu: 'Закрывает конёк кровли',
    unitId: 1,
    typeId: 5,
  },
  {
    id: 126,
    nameEn: 'Valley flashing',
    nameRu: 'Планка ендовы нижняя',
    descriptionEn: 'Laid in the valley before the sheets',
    descriptionRu: 'Укладывается в ендову до листов',
    unitId: 1,
    typeId: 5,
  },
  {
    id: 127,
    nameEn: 'Ridge filler',
    nameRu: 'Уплотнитель коньковый',
    descriptionEn: 'Profiled filler under the ridge flashing',
    descriptionRu: 'Профильный уплотнитель под планку конька',
    unitId: 1,
    typeId: 9,
  },
  {
    id: 128,
    nameEn: 'Snow guard',
    nameRu: 'Снегозадержатель трубчатый',
    descriptionEn: 'Set along the eaves, per the design',
    descriptionRu: 'Ставится по карнизу, по проекту',
    unitId: 8,
    typeId: 14,
  },
];

export const metalTileMaterialVariants: MaterialVariant[] = [
  // Гвоздь кровельный из shingles.ts: второй типоразмер, под крепление плёнки.
  { id: 761, materialId: 116, paramValueIds: [225, 256] }, // 3×40
  { id: 810, materialId: 121, paramValueIds: [] },
  { id: 820, materialId: 122, paramValueIds: [] },
  { id: 830, materialId: 123, paramValueIds: [254, 258] }, // 4,8×35 — рядовые листы
  { id: 831, materialId: 123, paramValueIds: [229, 258] }, // 4,8×80 — конёк
  { id: 832, materialId: 123, paramValueIds: [258, 259] }, // 4,8×19 — доборные элементы
  { id: 840, materialId: 124, paramValueIds: [231, 260] }, // 4×100
  { id: 850, materialId: 125, paramValueIds: [] },
  { id: 860, materialId: 126, paramValueIds: [] },
  { id: 870, materialId: 127, paramValueIds: [] },
  { id: 880, materialId: 128, paramValueIds: [] },
];

export const metalTileSystems: System[] = [
  {
    id: 5,
    title: 'METAL_TILE',
    nameRu: 'Металлочерепица',
    nameEn: 'Metal tile',
    descriptionRu: 'Скатная кровля из металлочерепицы по разреженной обрешётке',
    descriptionEn: 'Pitched metal tile roof over spaced battens',
    workTypeId: 2,
    unitId: 7,
  },
];

export const metalTileWorkStages: WorkStage[] = [
  {
    id: 30,
    title: 'metal tile underlay',
    nameRu: 'Гидроизоляция и контробрешётка',
    nameEn: 'Membrane and counter battens',
    systemId: 5,
    position: 1,
  },
  { id: 31, title: 'metal tile battens', nameRu: 'Обрешётка', nameEn: 'Battens', systemId: 5, position: 2 },
  {
    id: 32,
    title: 'metal tile eaves',
    nameRu: 'Карнизы и ендовы',
    nameEn: 'Eaves and valleys',
    systemId: 5,
    position: 3,
  },
  {
    id: 33,
    title: 'metal tile sheets',
    nameRu: 'Укладка листов',
    nameEn: 'Sheet laying',
    systemId: 5,
    position: 4,
  },
  {
    id: 34,
    title: 'metal tile ridge',
    nameRu: 'Конёк, торцы, вентиляция',
    nameEn: 'Ridge, rakes and ventilation',
    systemId: 5,
    position: 5,
  },
];

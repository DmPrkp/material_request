/**
 * Перегородка ГКЛ С112 — одинарный металлический каркас, двухслойная обшивка
 * с обеих сторон. Отдельным файлом и отдельным шагом сидов, а не дописано в общие
 * массивы: шаги отмечаются в seed_history поштучно, и новый шаг доезжает до уже
 * залитой базы, не требуя `down -v`. Дописанное в старый массив не доехало бы.
 *
 * Расход материалов — из технического листа КНАУФ на С112, на 1 м² перегородки
 * (https://www.knauf.ru/systems/peregorodki/peregorodki-gipsokarton/s-112/).
 * Числа производителя даны без запаса на раскрой; в ГЭСН 81-02-10 раздел 5
 * (таблицы 10-05-001…005) те же работы нормированы на 100 м² и уже с
 * трудноустранимыми потерями — расход там выше. Сверять при переносе в прод.
 *
 * Нормы расхода на эти этапы лежат в calc-server
 * (src/module.db/seed/005-c112_norms.seed.sql) и ссылаются сюда кодами сборок,
 * поэтому id здесь проставлены явно, как и во всех сидах словаря.
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

/**
 * Значения параметров, которых ещё не было. Уникальность — по тройке
 * (вид, число, единица), поэтому «75 мм ширины» и «75 мм толщины» — две строки.
 * Диаметру дан id меньше, чем длинам: код сборки сортирует id по возрастанию,
 * и так в нём сохраняется привычный порядок «Ø, потом длина».
 */
export const c112ParamValues: ParamValue[] = [
  { id: 247, kindId: 6, value: 3.5, unitId: 3 }, // Ø 3.5 мм — шуруп TN
  { id: 253, kindId: 1, value: 25, unitId: 3 }, // длина 25 мм — TN 25
  { id: 254, kindId: 1, value: 35, unitId: 3 }, // длина 35 мм — TN 35
  { id: 530, kindId: 10, value: 12.5, unitId: 3 }, // толщина 12.5 мм — ГКЛ
  { id: 531, kindId: 3, value: 75, unitId: 3 }, // ширина 75 мм — профиль
  { id: 532, kindId: 10, value: 75, unitId: 3 }, // толщина 75 мм — звукоизоляция
];

export const c112MaterialTypes: MaterialType[] = [
  { id: 13, code: 'board', nameRu: 'Листовые материалы', nameEn: 'Boards and sheets' },
];

export const c112Materials: Material[] = [
  {
    id: 100,
    nameEn: 'Gypsum plasterboard',
    nameRu: 'Гипсокартонный лист (ГКЛ)',
    descriptionEn: 'Gypsum board for partition cladding',
    descriptionRu: 'Гипсокартонный лист для обшивки перегородок и облицовок',
    unitId: 7,
    typeId: 13,
  },
  {
    id: 101,
    nameEn: 'Track profile (PN)',
    nameRu: 'Профиль направляющий ПН',
    descriptionEn: 'U-shaped track profile fixed to floor and ceiling',
    descriptionRu: 'Направляющий профиль каркаса, крепится к полу и потолку',
    unitId: 1,
    typeId: 5,
  },
  {
    id: 102,
    nameEn: 'Stud profile (PS)',
    nameRu: 'Профиль стоечный ПС',
    descriptionEn: 'C-shaped stud profile, spaced 600 mm in C112',
    descriptionRu: 'Стоечный профиль каркаса, в С112 шаг стоек 600 мм',
    unitId: 1,
    typeId: 5,
  },
  {
    id: 103,
    nameEn: 'Drywall screw (TN)',
    nameRu: 'Шуруп для гипсокартона TN',
    descriptionEn: 'Self-tapping screw for fixing boards to the metal frame',
    descriptionRu: 'Самонарезающий шуруп для крепления листов к металлическому каркасу',
    unitId: 8,
    typeId: 6,
  },
  {
    id: 104,
    nameEn: 'Sealing tape',
    nameRu: 'Лента уплотнительная',
    descriptionEn: 'Tape under track profiles at the junction with the structure',
    descriptionRu: 'Лента под направляющие профили в месте примыкания к конструкциям',
    unitId: 1,
    typeId: 9,
  },
  {
    id: 105,
    nameEn: 'Joint reinforcing tape',
    nameRu: 'Лента армирующая для швов',
    descriptionEn: 'Paper or mesh tape embedded in the joint filler',
    descriptionRu: 'Бумажная лента или серпянка, вклеивается в шпаклёвку шва',
    unitId: 1,
    typeId: 4,
  },
  {
    id: 106,
    nameEn: 'Gypsum joint filler',
    nameRu: 'Шпаклёвка гипсовая для швов',
    descriptionEn: 'Gypsum filler for board joints and screw heads',
    descriptionRu: 'Гипсовая шпаклёвка для швов листов и головок шурупов',
    unitId: 5,
    typeId: 2,
  },
  {
    id: 107,
    nameEn: 'Mineral acoustic insulation board',
    nameRu: 'Плита звукоизоляционная минеральная',
    descriptionEn: 'Mineral wool board filling the partition cavity',
    descriptionRu: 'Минераловатная плита для заполнения полости перегородки',
    unitId: 7,
    typeId: 1,
  },
];

/** Типоразмеры: 50 / 75 / 100 мм — три ширины профиля, под них же толщина ваты. */
export const c112MaterialVariants: MaterialVariant[] = [
  { id: 600, materialId: 100, paramValueIds: [530] }, // ГКЛ 12.5 мм
  { id: 610, materialId: 101, paramValueIds: [504] }, // ПН 50
  { id: 611, materialId: 101, paramValueIds: [531] }, // ПН 75
  { id: 612, materialId: 101, paramValueIds: [507] }, // ПН 100
  { id: 620, materialId: 102, paramValueIds: [504] }, // ПС 50
  { id: 621, materialId: 102, paramValueIds: [531] }, // ПС 75
  { id: 622, materialId: 102, paramValueIds: [507] }, // ПС 100
  { id: 630, materialId: 103, paramValueIds: [247, 253] }, // TN 3.5×25 — первый слой
  { id: 631, materialId: 103, paramValueIds: [247, 254] }, // TN 3.5×35 — второй слой
  { id: 640, materialId: 104, paramValueIds: [504] }, // лента уплотнительная 50
  { id: 641, materialId: 104, paramValueIds: [531] },
  { id: 642, materialId: 104, paramValueIds: [507] },
  { id: 650, materialId: 105, paramValueIds: [] },
  { id: 660, materialId: 106, paramValueIds: [] },
  { id: 670, materialId: 107, paramValueIds: [524] }, // звукоизоляция 50 мм
  { id: 671, materialId: 107, paramValueIds: [532] }, // 75 мм
  { id: 672, materialId: 107, paramValueIds: [527] }, // 100 мм
];

export const c112Systems: System[] = [
  {
    id: 3,
    title: 'GKL_C112',
    // Людям — простое название: «перегородки» сказаны уровнем выше, группой на
    // клиенте, а какая именно это система — в описании.
    nameRu: 'Гипсокартон',
    nameEn: 'Drywall',
    descriptionRu: 'С112: одинарный металлический каркас, двухслойная обшивка ГКЛ с обеих сторон',
    descriptionEn: 'C112: single metal frame, double-layer gypsum board cladding on both sides',
    workTypeId: 3,
    unitId: 7,
  },
];

/**
 * Этапы — по ходу работ. Обшивка разбита на два слоя не для красоты: у слоёв
 * разный шуруп (TN 25 и TN 35). id 13 пропущен — там был этап звукоизоляции,
 * его убрали; новые этапы id не переиспользуют, на них ссылаются нормы расхода.
 * title уникален на всю таблицу, отсюда префикс c112.
 */
export const c112WorkStages: WorkStage[] = [
  { id: 10, title: 'c112 layout', nameRu: 'Разметка', nameEn: 'Layout', systemId: 3, position: 1 },
  {
    id: 11,
    title: 'c112 frame',
    nameRu: 'Монтаж каркаса',
    nameEn: 'Frame assembly',
    systemId: 3,
    position: 2,
  },
  {
    id: 12,
    title: 'c112 first layer',
    nameRu: 'Обшивка первым слоем',
    nameEn: 'First board layer',
    systemId: 3,
    position: 3,
  },
  {
    id: 14,
    title: 'c112 second layer',
    nameRu: 'Обшивка вторым слоем',
    nameEn: 'Second board layer',
    systemId: 3,
    position: 4,
  },
  {
    id: 15,
    title: 'c112 joints',
    nameRu: 'Заделка швов и грунтование',
    nameEn: 'Joint filling and priming',
    systemId: 3,
    position: 5,
  },
];

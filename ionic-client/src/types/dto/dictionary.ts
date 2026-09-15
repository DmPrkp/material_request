/**
 * Ответы dictionary-server (/dict/api/v1).
 *
 * Имя и описание приходят одним полем (name, description) уже на языке интерфейса:
 * словарь сворачивает nameRu/nameEn по Accept-Language, который ставит
 * BaseModel.setLocale. Нет перевода — русское значение.
 */

/** Вид работ: фасад, кровля, внутренняя отделка — уровень над технологиями. */
export type DictionaryWorkType = {
  id: number;
  /** Сегмент адреса и ключ картинки плитки: facade, roof, interior. */
  code: string;
  name: string;
  createdBy: number | null;
  isActive: boolean;
};

/**
 * Технология работ (в API — systems): мокрый фасад, рамные леса.
 * title — технический код (по нему ходит calc-server), людям показывается name.
 */
export type DictionarySystem = {
  id: number;
  title: string;
  name: string;
  description: string | null;
  workTypeId: number;
  /** id пользователя, который её добавил; null — пришла из сидов. */
  createdBy: number | null;
  isActive: boolean;
};

/** Этап (слой) работ внутри системы; position — порядок в ней. */
export type DictionaryWorkStage = {
  id: number;
  title: string;
  name: string;
  position: number;
  systemId: number;
  createdBy: number | null;
  isActive: boolean;
};

/**
 * Технология как в базе, на обоих языках, — только для формы правки
 * (?translations=all). Везде остальное — одно name на языке страницы.
 */
export type DictionarySystemTranslations = {
  id: number;
  /** Заполнен язык, на котором работали в интерфейсе; остальные могут быть пустыми. */
  nameRu: string | null;
  nameEn: string | null;
  descriptionRu: string | null;
  descriptionEn: string | null;
};

/** Этап на обоих языках — для формы правки. */
export type DictionaryWorkStageTranslations = {
  id: number;
  position: number;
  nameRu: string | null;
  nameEn: string | null;
};

export type DictionaryPage<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type DictionaryUnit = {
  id: number;
  code: string;
  name: string;
};

/** Тип материала: пиломатериалы, крепёж, леса… У материала может отсутствовать. */
export type DictionaryMaterialType = {
  id: number;
  code: string;
  name: string;
};

export type DictionaryMaterial = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  unit: DictionaryUnit;
  type: DictionaryMaterialType | null;
  variantsCount: number;
  /** id пользователя, который его добавил; null — пришёл из сидов. */
  createdBy: number | null;
};

/** Материал как в базе, на всех языках, — только для формы правки (?translations=all). */
export type DictionaryMaterialTranslations = {
  id: number;
  nameRu: string | null;
  nameEn: string | null;
  descriptionRu: string | null;
  descriptionEn: string | null;
  unitId: number;
  typeId: number | null;
};

export type DictionaryHandTool = {
  id: number;
  name: string;
  isActive: boolean;
  /** Сколько типоразмеров с параметрами; служебный вариант без параметров не в счёт. */
  variantsCount: number;
  /** id пользователя, который его добавил; null — пришёл из сидов. */
  createdBy: number | null;
};

/** Ручной инструмент на всех языках — только для формы правки (?translations=all). */
export type DictionaryHandToolTranslations = {
  id: number;
  nameRu: string | null;
  nameEn: string | null;
};

/**
 * Расписан целиком, а не через DictionaryHandTool & {...}: у электроинструмента
 * типоразмеров не бывает, и variantsCount сервер для него не отдаёт.
 */
export type DictionaryPowerTool = {
  id: number;
  name: string;
  isActive: boolean;
  isCorded: boolean;
};

/** Параметр типоразмера: значение с единицей и видом (длина, диаметр…). */
export type DictionaryVariantParam = {
  paramValueId: number;
  value: string;
  unit: string;
  unitId: number;
  kind: string | null;
  kindId: number | null;
};

/** Вид параметра: длина, диаметр, напряжение. */
export type DictionaryParamKind = {
  id: number;
  code: string;
  name: string;
};

/** Значение параметра («6 мм диаметра») — подсказки в форме типоразмеров. */
export type DictionaryParamValue = {
  id: number;
  /** numeric из базы строкой: '6.0000'. */
  value: string;
  isActive: boolean;
  unit: DictionaryUnit;
  kind: DictionaryParamKind | null;
};

/** Типоразмер позиции: дюбель Ø8 × 226 мм, рулетка 5 м. */
export type DictionaryVariant = {
  id: number;
  code: string;
  ownerId: number;
  isActive: boolean;
  params: DictionaryVariantParam[];
};

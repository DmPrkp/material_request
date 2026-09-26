import BaseModel from "./BaseModel";
import type {
  DictionaryHandTool,
  DictionaryHandToolTranslations,
  DictionaryMaterial,
  DictionaryMaterialTranslations,
  DictionaryMaterialType,
  DictionaryPage,
  DictionaryParamKind,
  DictionaryParamValue,
  DictionaryUnit,
  DictionaryPowerTool,
  DictionarySystem,
  DictionaryVariant,
  DictionaryVariantWithOwner,
  DictionarySystemTranslations,
  DictionaryWorkStage,
  DictionaryWorkStageTranslations,
  DictionaryWorkType,
} from "@/types/dto";

/** Видов, технологий и этапов единицы-десятки: берём разом по максимуму страницы словаря. */
const STRUCTURE_LIMIT = 200;

/**
 * Пишем только язык страницы, читаем одно name — на языке страницы или ближайшее
 * заполненное. Хоть одно название обязательно. null — стереть значение на этом языке.
 * Технический код (title) не шлём — его придумывает словарь.
 */
export type NewSystem = {
  nameRu?: string | null;
  nameEn?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  workTypeId: number;
  /** Единица объёма работ — обязательна: калькулятор подписывает ею поля. */
  unitId: number;
};
export type SystemChanges = Partial<Omit<NewSystem, "workTypeId">>;
/** Без position словарь ставит этап последним в системе. */
export type NewWorkStage = {
  nameRu?: string | null;
  nameEn?: string | null;
  systemId: number;
  position?: number;
};
export type WorkStageChanges = { nameRu?: string | null; nameEn?: string | null };
/** Материал: названия — как у технологий; единица обязательна, тип — нет (null — снять). */
export type NewMaterial = {
  nameRu?: string | null;
  nameEn?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  unitId: number;
  typeId?: number | null;
  /** Сборки нового материала, как у ручного инструмента; пусто — одна без параметров. */
  variants?: VariantParamInput[][];
};
export type MaterialChanges = Partial<Omit<NewMaterial, "variants">>;
/** Чьи сборки: сегмент адреса позиции в словаре. */
export type VariantOwner = "hand-tools" | "materials";
/**
 * Параметр типоразмера, как его вводят в форме. id значения словарь подберёт сам
 * или заведёт новое. kindId null — значение без вида.
 */
export type VariantParamInput = {
  kindId: number | null;
  unitId: number;
  value: number;
};
/**
 * Ручной инструмент: название — как у технологий; variants — типоразмеры, каждый —
 * набор параметров. Пустой список — словарь заведёт один служебный без параметров.
 */
export type NewHandTool = {
  nameRu?: string | null;
  nameEn?: string | null;
  variants?: VariantParamInput[][];
};
export type HandToolChanges = { nameRu?: string | null; nameEn?: string | null };

export type CatalogQuery = {
  page?: number;
  limit?: number;
  q?: string;
  /** Только материалы этого типа. */
  typeId?: number;
  /** Только материалы, у которых тип не проставлен. */
  untyped?: boolean;
  /** Электроинструмент по питанию: true — сетевой, false — аккумуляторный. */
  corded?: boolean;
};

function toQueryString(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.typeId) params.set("typeId", String(query.typeId));
  if (query.untyped) params.set("untyped", "true");
  if (query.corded !== undefined) params.set("corded", String(query.corded));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default class DictionaryModel extends BaseModel {
  static apiVersion = "/dict/api/v1";

  // BaseModel склеивает baseURL + apiVersion + params встык,
  // поэтому путь обязан начинаться со слэша — как в BaseCalcModel.

  static materials(query: CatalogQuery = {}) {
    return this.get<DictionaryPage<DictionaryMaterial>>(
      `/materials${toQueryString(query)}`
    );
  }

  static handTools(query: CatalogQuery = {}) {
    return this.get<DictionaryPage<DictionaryHandTool>>(
      `/hand-tools${toQueryString(query)}`
    );
  }

  static powerTools(query: CatalogQuery = {}) {
    return this.get<DictionaryPage<DictionaryPowerTool>>(
      `/power-tools${toQueryString(query)}`
    );
  }

  static materialTypes() {
    return this.get<DictionaryPage<DictionaryMaterialType>>(
      `/material-types?limit=${STRUCTURE_LIMIT}`
    );
  }

  static units() {
    return this.get<DictionaryPage<DictionaryUnit>>(
      `/units?limit=${STRUCTURE_LIMIT}`
    );
  }

  /** Только для формы правки — оба языка сразу, см. systemTranslations. */
  static materialTranslations(id: number) {
    return this.get<DictionaryMaterialTranslations>(
      `/materials/${id}?translations=all`
    );
  }

  static createMaterial(body: NewMaterial) {
    return this.post<DictionaryMaterial>({ params: "/materials", body });
  }

  static updateMaterial(id: number, body: MaterialChanges) {
    return this.patch<DictionaryMaterial>({ params: `/materials/${id}`, body });
  }

  static materialVariants(id: number) {
    return this.get<DictionaryVariant[]>(`/materials/${id}/variants`);
  }

  static handToolTranslations(id: number) {
    return this.get<DictionaryHandToolTranslations>(
      `/hand-tools/${id}?translations=all`
    );
  }

  static createHandTool(body: NewHandTool) {
    return this.post<DictionaryHandTool>({ params: "/hand-tools", body });
  }

  static updateHandTool(id: number, body: HandToolChanges) {
    return this.patch<DictionaryHandTool>({ params: `/hand-tools/${id}`, body });
  }

  static variants(owner: VariantOwner, id: number) {
    return this.get<DictionaryVariant[]>(`/${owner}/${id}/variants`);
  }

  static createVariant(
    owner: VariantOwner,
    id: number,
    params: VariantParamInput[]
  ) {
    return this.post<DictionaryVariant>({
      params: `/${owner}/${id}/variants`,
      body: { params },
    });
  }

  /** Набор параметров заменяется целиком; id сборки остаётся, code пересчитывается. */
  static updateVariant(
    owner: VariantOwner,
    id: number,
    variantId: number,
    params: VariantParamInput[]
  ) {
    return this.put<DictionaryVariant>({
      params: `/${owner}/${id}/variants/${variantId}`,
      body: { params },
    });
  }

  static paramKinds() {
    return this.get<DictionaryPage<DictionaryParamKind>>(
      `/param-kinds?limit=${STRUCTURE_LIMIT}`
    );
  }

  static paramValues(unitId: number) {
    return this.get<DictionaryPage<DictionaryParamValue>>(
      `/param-values?unitId=${unitId}&limit=${STRUCTURE_LIMIT}`
    );
  }

  /**
   * Сборки по кодам — с названием позиции: этим нормы расхода и ссылаются.
   * Архивные приходят тоже, чужие личные — тоже: по точной ссылке словарь отдаёт
   * всем одно и то же. Не придёт только то, чего уже нет: сборку удалили или ей
   * переписали параметры, и код стал другим. Строка нормы остаётся без названия.
   */
  static variantsByCodes(owner: VariantOwner, codes: string[]) {
    const path = owner === "hand-tools" ? "hand-tool-variants" : "material-variants";
    const query = encodeURIComponent(codes.join(","));
    return this.get<DictionaryVariantWithOwner[]>(`/${path}?codes=${query}`);
  }

  /**
   * Электроинструмент по id — у него нет сборок, и нормы со складом ссылаются на позицию.
   * Отдельный lookup, а не ?ids= на списке: тот отдаёт страницу и фильтрует видимость.
   */
  static powerToolsByIds(ids: number[]) {
    const query = encodeURIComponent(ids.join(","));
    return this.get<DictionaryPowerTool[]>(`/power-tools/lookup?ids=${query}`);
  }

  static handToolVariants(id: number) {
    return this.get<DictionaryVariant[]>(`/hand-tools/${id}/variants`);
  }

  static workTypes() {
    return this.get<DictionaryPage<DictionaryWorkType>>(
      `/work-types?limit=${STRUCTURE_LIMIT}`
    );
  }

  /** Технологии работ; с workTypeId — только этого вида работ. */
  static systems(workTypeId?: number) {
    const filter = workTypeId ? `&workTypeId=${workTypeId}` : "";
    return this.get<DictionaryPage<DictionarySystem>>(
      `/systems?limit=${STRUCTURE_LIMIT}${filter}`
    );
  }

  static workStages() {
    return this.get<DictionaryPage<DictionaryWorkStage>>(
      `/work-stages?limit=${STRUCTURE_LIMIT}`
    );
  }

  // Только для формы правки: там нужны оба языка сразу, а обычные ответы
  // отдают одно name на языке страницы. ?translations=all отключает сворачивание.

  /**
   * Технология по техническому коду из адреса калькулятора (/zayavka/calculator/facade/EIFS) —
   * вместе с единицей объёма. Не видна или нет такой — undefined, как у всех get().
   */
  static systemByTitle(title: string) {
    return this.get<DictionarySystem>(
      `/systems/by-title/${encodeURIComponent(title)}`
    );
  }

  /** Технология на языке страницы; чужая личная — undefined, как несуществующая. */
  static system(id: number) {
    return this.get<DictionarySystem>(`/systems/${id}`);
  }

  /** Этапы технологии по порядку, на языке страницы. */
  static systemStages(id: number) {
    return this.get<DictionaryWorkStage[]>(`/systems/${id}/work-stages`);
  }

  static systemTranslations(id: number) {
    return this.get<DictionarySystemTranslations>(
      `/systems/${id}?translations=all`
    );
  }

  static workStageTranslations(systemId: number) {
    return this.get<DictionaryPage<DictionaryWorkStageTranslations>>(
      `/work-stages?systemId=${systemId}&limit=${STRUCTURE_LIMIT}&translations=all`
    );
  }

  // Запись — только с токеном: Authorization в baseOpts кладёт стор авторизации
  // через BaseModel.setAuthToken, а кто добавил, словарь берёт из самого токена.

  static createSystem(body: NewSystem) {
    return this.post<DictionarySystem>({ params: "/systems", body });
  }

  static createWorkStage(body: NewWorkStage) {
    return this.post<DictionaryWorkStage>({ params: "/work-stages", body });
  }

  static updateSystem(id: number, body: SystemChanges) {
    return this.patch<DictionarySystem>({ params: `/systems/${id}`, body });
  }

  static updateWorkStage(id: number, body: WorkStageChanges) {
    return this.patch<DictionaryWorkStage>({
      params: `/work-stages/${id}`,
      body,
    });
  }

  // Удаление мягкое (is_active = false): позиция пропадает из выдачи, а расчёты,
  // где она уже участвует, не ломаются. Своё — автору, любое — админу; иначе 403.

  static removeMaterial(id: number) {
    return this.delete({ params: `/materials/${id}` });
  }

  static removeHandTool(id: number) {
    return this.delete({ params: `/hand-tools/${id}` });
  }

  /** Этапы уходят вместе с технологией: без неё их не показать. */
  static removeSystem(id: number) {
    return this.delete({ params: `/systems/${id}` });
  }

  static removeVariant(owner: VariantOwner, variantId: number) {
    const path = owner === "hand-tools" ? "hand-tool-variants" : "material-variants";
    return this.delete({ params: `/${path}/${variantId}` });
  }
}

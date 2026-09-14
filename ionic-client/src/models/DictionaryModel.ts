import BaseModel from "./BaseModel";
import type {
  DictionaryHandTool,
  DictionaryMaterial,
  DictionaryPage,
  DictionaryPowerTool,
  DictionarySystem,
  DictionaryVariant,
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

export type CatalogQuery = {
  page?: number;
  limit?: number;
  q?: string;
};

function toQueryString(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q?.trim()) params.set("q", query.q.trim());
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

  static materialVariants(id: number) {
    return this.get<DictionaryVariant[]>(`/materials/${id}/variants`);
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
}

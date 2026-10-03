import { ZayavkaType } from "../entity/zayavka";

export type CalcResponseDTO = {
  id: number;
  title: string;
  hand_tools: HandTool[];
  materials: Material[];
  power_tools: PowerTool[];
};

export type MaterialListDTO = {
  id: number;
  title: string;
  hand_tools?: HandTool[];
  materials: Material[];
  power_tools?: PowerTool[];
};

export type ResultMaterialsDTO = {
  hand_tools: MergedHandTool[];
  materials: MaterialListDTO[];
  power_tools: PowerTool[];
};

export type PowerTool = {
  uniqKey: string;
  id: number;
  title: string;
  adjusted_consumption: number;
  corded: boolean;
  params: Param[];
};

export type MergedPowerTools = Record<string, PowerTool>;

export type HandTool = {
  uniqKey: string;
  id: number;
  title: string;
  adjusted_consumption: number;
  description?: string;
  params: Param[];
};

export type MergedHandTool = HandTool & {
  descriptions?: string[];
};

export type MergedHandTools = Record<string, MergedHandTool>;

export type Material = {
  uniqKey: string;
  consumption: number;
  id: number;
  measure: string;
  params: Param[];
  title: string;
  volume: number;
  description: string;
};

type Param = {
  id: number;
  param: string;
  measure: string;
  title?: string;
};

/**
 * Параметр расчёта технологии — GET /calc/:system/options. Формат тот же, что у
 * параметров сборки: id — значение параметра в словаре, его и отправляют обратно
 * в расчёт (толщина перегородки = ширина профиля 50/75/100).
 */
export type CalcOption = Param;

export type MaterialRequestDTO = {
  data: string;
  createdAt: string;
  updatedAt: string;
  id: number;
  userId?: number | null;
};

export type StoredMaterialRequestDTO = {
  data: ZayavkaType;
  createdAt: string;
  updatedAt: string;
  id: number;
};

export type { AuthResponse, RegisterPayload, UserProfile } from "./auth";
export type {
  DictionaryPage,
  DictionaryUnit,
  DictionaryMaterial,
  DictionaryMaterialType,
  DictionaryMaterialTranslations,
  DictionaryHandTool,
  DictionaryHandToolTranslations,
  DictionaryPowerTool,
  DictionaryVariant,
  DictionaryVariantWithOwner,
  DictionaryVariantParam,
  DictionaryParamKind,
  DictionaryParamValue,
  DictionarySystem,
  DictionarySystemTranslations,
  DictionaryWorkStage,
  DictionaryWorkStageTranslations,
  DictionaryWorkType,
} from "./dictionary";
export type { NormKind, StageNorm, StageNorms, StageNormsInput } from "./norms";
export type {
  Company,
  CompanyMember,
  CompanyPage,
  CompanyRole,
} from "./company";
export type { UserName } from "./user";
export type {
  HoldingItem,
  Warehouse,
  WarehouseCreateInput,
  WarehouseItem,
  WarehouseItemInput,
  WarehouseItemKind,
  WarehouseItemTake,
  WarehousePage,
} from "./warehouse";

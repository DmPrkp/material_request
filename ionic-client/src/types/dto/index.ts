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

export type { AuthResponse, UserProfile } from './auth';

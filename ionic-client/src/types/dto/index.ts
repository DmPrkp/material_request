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
  hand_tools: HandTool[];
  materials: MaterialListDTO[];
  power_tools: PowerTool[];
};

export type PowerTool = {
  uniqKey: string;
  id: number;
  title: string;
  ru_title: string;
  adjusted_consumption: number;
  corded: boolean;
  params: Param[];
};

export type MergedPowerTools = Record<string, PowerTool>;

export type HandTool = {
  uniqKey: string;
  id: number;
  title: string;
  ru_title: string;
  adjusted_consumption: number;
  params: Param[];
};

export type MergedHandTools = Record<string, HandTool>;

export type Material = {
  consumption: number;
  id: number;
  measure: string;
  params: Param[];
  ru_title: string;
  title: string;
  volume: number;
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
};

export type StoredMaterialRequestDTO = {
  data: ZayavkaType;
  createdAt: string;
  updatedAt: string;
  id: number;
};

export type CreateZayavkaDto = {
  hand_tools: HandTool[];
  materials: MaterialDTO[];
  power_tools: PowerTool[];
  system: string;
  user?: number;
};

type MaterialDTO = {
  id: number;
  title: string;
  materials: Material[];
};

export type PowerTool = {
  uniqKey: string;
  id: number;
  title: string;
  adjusted_consumption: number;
  corded: boolean;
  params: Param[];
};

export type HandTool = {
  uniqKey: string;
  id: number;
  title: string;
  adjusted_consumption: number;
  params: Param[];
};

export type Material = {
  consumption: number;
  id: number;
  measure: string;
  params: Param[];
  title: string;
  volume: number;
};

export type Param = {
  id: number;
  param: string;
  measure: string;
};

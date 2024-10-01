export type CalcResponseDTO = {
  id: number;
  title: string;
  hand_tools: HandTool[];
  materials: Material[];
  power_tools: PowerTool[];
};

export type PowerTool = {
  id: number;
  title: string;
  ru_title: string;
  adjusted_consumption: number;
  params: Param[];
};

export type HandTool = {
  id: number;
  title: string;
  ru_title: string;
  adjusted_consumption: number;
  params: Param[];
};

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
};

export type CalcResponseDTO = {
  id: number;
  title: string;
  hand_tools: HandTool[];
};

export type HandTool = {
  id: number;
  title: string;
  ru_title: string;
  adjusted_consumption: number;
  params: ToolParam[];
};

type ToolParam = {
  id: number;
  param: string;
  measure: string;
};

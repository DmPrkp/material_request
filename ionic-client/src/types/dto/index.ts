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
  params: HandToolParam[];
};

type HandToolParam = {
  parameter: string;
  measure: string;
};

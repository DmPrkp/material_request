type HandToolParam = {
  parameter: string;
  measure: string;
};

type HandTool = {
  id: number;
  title: string;
  ru_title: string;
  adjusted_consumption: number;
  params: HandToolParam[];
};

export type CalcResponseDTO = {
  id: number;
  title: string;
  hand_tools: HandTool[];
};

type Components = Record<number, number>;
type Crew = number;

export type CalcRequestDTO = {
  components: Components;
  crew: Crew;
};

export type RawResult = {
  component_id: number;
  component_title: string;
  hand_tool_id: number;
  hand_tool_param_id: number;
  hand_tool_title: string;
  ru_title: string;
  parameter: string;
  measure: string;
  adjusted_consumption: number;
};

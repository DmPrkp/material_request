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

type PowerTool = {
  id: number;
  title: string;
  ru_title: string;
  corded: boolean;
  adjusted_consumption: number;
  params: HandToolParam[];
};

type Material = {
  id: number;
  title: string;
};

export type CalcResponseDTO = {
  id: number;
  title: string;
  hand_tools: HandTool[];
  power_tools: PowerTool[];
  materials: Material[];
};

type Components = Record<number, number>;
type Crew = number;

export type CalcRequestDTO = {
  components: Components;
  crew: Crew;
};

export type RawHandToolResult = {
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

export type RawPowerToolResult = {
  component_id: number;
  component_title: string;
  power_tool_id: number;
  power_tool_param_id: number;
  power_tool_title: string;
  corded: boolean;
  ru_title: string;
  parameter: string;
  measure: string;
  adjusted_consumption: number;
};

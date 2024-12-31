import { HandTool, MaterialListDTO, PowerTool } from "../dto";

export type ZayavkaType = {
  id?: number;
  system: string;
  hand_tools: HandTool[];
  materials: MaterialListDTO[];
  power_tools: PowerTool[];
};

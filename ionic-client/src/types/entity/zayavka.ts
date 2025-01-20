import { MaterialListDTO, MergedHandTool, PowerTool } from "../dto";

export type ZayavkaType = {
  id?: number;
  system: string;
  hand_tools: MergedHandTool[];
  materials: MaterialListDTO[];
  power_tools: PowerTool[];
};

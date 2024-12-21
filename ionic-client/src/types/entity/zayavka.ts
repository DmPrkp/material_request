import { HandTool, Material, PowerTool } from "../dto";

export type ZayavkaType = {
  id?: number;
  system: string;
  hand_tools: HandTool[];
  materials: Material[];
  power_tools: PowerTool[];
};

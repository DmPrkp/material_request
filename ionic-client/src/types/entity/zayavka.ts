import { HandTool, Material, PowerTool } from "../dto";

export type ZayavkaType = {
  uuid: string;
  hand_tools: HandTool[];
  materials: Material[];
  power_tools: PowerTool[];
};

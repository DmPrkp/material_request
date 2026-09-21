import { MaterialListDTO, MergedHandTool, PowerTool } from "../dto";

export type ZaiavkaType = {
  id?: number;
  /** Имя, которое дал пользователь; пока его просит только объединение заявок. */
  name?: string;
  system: string;
  hand_tools: MergedHandTool[];
  materials: MaterialListDTO[];
  power_tools: PowerTool[];
};

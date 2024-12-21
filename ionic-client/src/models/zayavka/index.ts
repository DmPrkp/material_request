import { ZayavkaType } from "@/types/entity/zayavka";
import BaseOrderModel from "./BaseZayavkaModel";
import { ZayavkaDTO } from "@/types/dto";

export default class Order {
  data: ZayavkaType;

  constructor(data: ZayavkaType) {
    this.data = {
      system: data.system,
      hand_tools: data.hand_tools ?? [],
      materials: data.materials ?? [],
      power_tools: data.power_tools ?? [],
    };
  }

  create() {
    return BaseOrderModel.post<ZayavkaDTO>({
      params: "/zayavka",
      body: this.data,
    });
  }
}

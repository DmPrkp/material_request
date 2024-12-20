import { ZayavkaType } from "@/types/entity/zayavka";
import BaseOrderModel from "./BaseZayavkaModel";
import { v4 as uuidv4 } from "uuid";

export default class Order {
  data: ZayavkaType;

  constructor(data: Partial<ZayavkaType>) {
    this.data = {
      ...data,
      uuid: data.uuid ?? uuidv4(),
      hand_tools: data.hand_tools ?? [],
      materials: data.materials ?? [],
      power_tools: data.power_tools ?? [],
    };
  }

  create() {
    return BaseOrderModel.post({ params: "/zayavka", body: this.data });
  }
}

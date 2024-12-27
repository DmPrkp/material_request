import { ZayavkaType } from "@/types/entity/zayavka";
import BaseOrderModel from "./BaseZayavkaModel";
import { MaterialRequestDTO } from "@/types/dto";

export default class Order {
  data: ZayavkaType;

  static async findAll() {
    const materialRequests = await BaseOrderModel.get<MaterialRequestDTO[]>(
      "/zayavka"
    );
    return materialRequests || [];
  }

  constructor(data: ZayavkaType) {
    this.data = {
      system: data.system,
      hand_tools: data.hand_tools ?? [],
      materials: data.materials ?? [],
      power_tools: data.power_tools ?? [],
    };
  }

  create() {
    return BaseOrderModel.post<MaterialRequestDTO>({
      params: "/zayavka",
      body: this.data,
    });
  }
}
import { ZayavkaType } from "@/types/entity/zayavka";
import BaseOrderModel from "./BaseZayavkaModel";
import { MaterialRequestDTO } from "@/types/dto";

export default class Zayavka {
  data: ZayavkaType;

  static async findAll() {
    const materialRequests = await BaseOrderModel.get<MaterialRequestDTO[]>(
      "/zayavka"
    );
    return materialRequests || [];
  }

  static async find(id: number) {
    const materialRequest = await BaseOrderModel.get<MaterialRequestDTO>(
      `/zayavka/${id}`
    );
    return materialRequest;
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

  generateXLSX() {
    return BaseOrderModel.downloadFile({
      params: "/xlsx-generator",
      body: this.data,
    });
  }

  update(id: number, data: ZayavkaType) {
    return BaseOrderModel.put<MaterialRequestDTO>({
      params: `/zayavka/${id}`,
      body: data,
    });
  }
}

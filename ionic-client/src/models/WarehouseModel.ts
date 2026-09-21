import BaseModel from "./BaseModel";
import type {
  Warehouse,
  WarehouseCreateInput,
  WarehouseItem,
  WarehouseItemInput,
  WarehousePage,
} from "@/types/dto";

/** Максимум сервиса; страниц на экране складов пока нет. */
const WAREHOUSES_LIMIT = 200;

export default class WarehouseModel extends BaseModel {
  static apiVersion = "/warehouse/api/v1";

  /** Свои действующие склады. undefined — не достучались (get глотает ошибку). */
  static async listMine(): Promise<Warehouse[] | undefined> {
    const page = await this.get<WarehousePage>(`/warehouses?limit=${WAREHOUSES_LIMIT}`);
    return page?.items;
  }

  static byId(id: number) {
    return this.get<Warehouse>(`/warehouses/${id}`);
  }

  /**
   * Физически, вместе с содержимым и назначениями (ON DELETE CASCADE на стороне базы).
   * Без ?hard=true сервис только архивирует — но склад с содержимым прятать смысла нет.
   */
  static remove(id: number) {
    return this.delete({ params: `/warehouses/${id}?hard=true` });
  }

  static create(input: WarehouseCreateInput) {
    return this.post<Warehouse>({ params: "/warehouses", body: input });
  }

  /** Что лежит на складе. undefined — не достучались (get глотает ошибку). */
  static items(id: number) {
    return this.get<WarehouseItem[]>(`/warehouses/${id}/items`);
  }

  /** Пачка позиций одной транзакцией; та же позиция складывается с лежащей на складе. */
  static addItems(id: number, items: WarehouseItemInput[]) {
    return this.post<WarehouseItem[]>({
      params: `/warehouses/${id}/items`,
      body: { items },
    });
  }
}

import BaseModel from "./BaseModel";
import type {
  HoldingItem,
  Warehouse,
  WarehouseCreateInput,
  WarehouseItem,
  WarehouseItemInput,
  WarehouseItemTake,
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

  /**
   * Склады компании, которые видит спрашивающий: own/manage — все, остальным — свои и
   * назначенные среди них. Без companyId — свои и назначенные вообще.
   */
  static async listByCompany(companyId: number | null): Promise<Warehouse[] | undefined> {
    const filter = companyId ? `&companyId=${companyId}` : "";
    const page = await this.get<WarehousePage>(
      `/warehouses?limit=${WAREHOUSES_LIMIT}${filter}`
    );
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

  /**
   * Снять выбранное: у каждой позиции — сколько (можно часть, остаток останется).
   * Все или ничего: хоть одной нет или просят больше, чем лежит, — не снимется ни одна.
   */
  static removeItems(id: number, items: WarehouseItemTake[]) {
    return this.post<void>({
      params: `/warehouses/${id}/items/remove`,
      body: { items },
    });
  }

  /** Переложить на другой склад той же компании; там та же позиция складывается с лежащей. */
  static moveItems(
    id: number,
    items: WarehouseItemTake[],
    targetWarehouseId: number
  ) {
    return this.post<WarehouseItem[]>({
      params: `/warehouses/${id}/items/move`,
      body: { items, targetWarehouseId },
    });
  }

  /**
   * Выдать на руки участнику компании склада. «Руки» сервис заводит сам при первой
   * выдаче; с личного склада и с рук не выдают — 400.
   */
  static issueItems(id: number, items: WarehouseItemTake[], userId: number) {
    return this.post<HoldingItem[]>({
      params: `/warehouses/${id}/items/issue`,
      body: { items, userId },
    });
  }

  /** Всё, что у меня на руках, из всех компаний. undefined — не достучались. */
  static holdingsMine() {
    return this.get<HoldingItem[]>("/holdings/mine");
  }

  /** Пачка позиций одной транзакцией; та же позиция складывается с лежащей на складе. */
  static addItems(id: number, items: WarehouseItemInput[]) {
    return this.post<WarehouseItem[]>({
      params: `/warehouses/${id}/items`,
      body: { items },
    });
  }
}

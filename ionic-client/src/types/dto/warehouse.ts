/** Склад — зеркало warehouse-server/src/db/schema.ts (то, что нужно клиенту). */
export type Warehouse = {
  id: number;
  /** Создатель склада: он его и удаляет, наравне с own/manage компании. */
  ownerId: number;
  name: string;
  address: string | null;
  description: string | null;
  companyId: number | null;
  isActive: boolean;
  /** Приходит только в списке. */
  counts?: WarehouseItemCounts;
  createdAt: string;
  updatedAt: string;
};

export type WarehousePage = {
  items: Warehouse[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

/** Тело POST /warehouses; без companyId склад личный. */
export type WarehouseCreateInput = { name: string; companyId?: number };

/** Вид позиции склада — как в нормах расхода: сборка или электроинструмент. */
export type WarehouseItemKind = "material" | "hand_tool" | "power_tool";

/** Сколько наименований каждого вида лежит на складе (строк, а не количество). */
export type WarehouseItemCounts = Record<WarehouseItemKind, number>;

/**
 * Позиция на складе. ref — код сборки (uniqKey в заявке) у материала и ручного
 * инструмента, id позиции строкой у электроинструмента. Названия сюда не едут —
 * их отдаёт словарь по тем же кодам.
 */
export type WarehouseItem = {
  id: number;
  kind: WarehouseItemKind;
  ref: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseItemInput = {
  kind: WarehouseItemKind;
  ref: string;
  quantity: number;
};

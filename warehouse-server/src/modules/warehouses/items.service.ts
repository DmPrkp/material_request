import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import type { AuthUser } from '~/auth/auth-user';
import { DB, type Database } from '~/db/db.module';
import { type WarehouseItem, type WarehouseItemKind, warehouseItems } from '~/db/schema';
import type { WarehouseItemInput } from './items.dto';
import { WarehousesService } from './warehouses.service';

/** Количество наружу — числом: в базе numeric, а pg отдаёт его строкой. */
export type WarehouseItemView = {
  id: number;
  kind: WarehouseItemKind;
  ref: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Содержимое склада ведёт любой, кому склад виден: владелец, назначенные и own/manage
 * компании. Отдельного права «кладовщик» нет — назначение на склад и есть оно.
 */
@Injectable()
export class WarehouseItemsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly warehouses: WarehousesService,
  ) {}

  async list(warehouseId: number, user: AuthUser): Promise<WarehouseItemView[]> {
    await this.warehouses.byId(warehouseId, user);
    const rows = await this.db
      .select()
      .from(warehouseItems)
      .where(eq(warehouseItems.warehouseId, warehouseId))
      .orderBy(asc(warehouseItems.kind), asc(warehouseItems.ref));
    return rows.map(toView);
  }

  /**
   * Добавить позиции; та же позиция складывается с лежащей на складе, а не заводит
   * вторую строку. Вся пачка — одной транзакцией: заявка уезжает на склад целиком.
   */
  async add(warehouseId: number, items: WarehouseItemInput[], user: AuthUser): Promise<WarehouseItemView[]> {
    await this.warehouses.byId(warehouseId, user);

    return this.db.transaction(async (tx) => {
      const saved: WarehouseItem[] = [];
      // По одной: у одной позиции в пачке может быть несколько строк (разные этапы
      // заявки), и вставка списком с onConflict сложила бы только последнюю.
      for (const item of items) {
        const [row] = await tx
          .insert(warehouseItems)
          .values({ warehouseId, kind: item.kind, ref: item.ref, quantity: String(item.quantity) })
          .onConflictDoUpdate({
            target: [warehouseItems.warehouseId, warehouseItems.kind, warehouseItems.ref],
            set: {
              quantity: sql`${warehouseItems.quantity} + ${String(item.quantity)}`,
              updatedAt: new Date(),
            },
          })
          .returning();
        saved.push(row);
      }
      return saved.map(toView);
    });
  }

  /** Поставить количество вместо накопленного — поправить пересчитанное руками. */
  async setQuantity(
    warehouseId: number,
    itemId: number,
    quantity: number,
    user: AuthUser,
  ): Promise<WarehouseItemView> {
    await this.warehouses.byId(warehouseId, user);
    const [row] = await this.db
      .update(warehouseItems)
      .set({ quantity: String(quantity) })
      .where(and(eq(warehouseItems.warehouseId, warehouseId), eq(warehouseItems.id, itemId)))
      .returning();
    if (!row) throw notFound(itemId, warehouseId);
    return toView(row);
  }

  async remove(warehouseId: number, itemId: number, user: AuthUser): Promise<void> {
    await this.warehouses.byId(warehouseId, user);
    const deleted = await this.db
      .delete(warehouseItems)
      .where(and(eq(warehouseItems.warehouseId, warehouseId), eq(warehouseItems.id, itemId)))
      .returning({ id: warehouseItems.id });
    if (deleted.length === 0) throw notFound(itemId, warehouseId);
  }
}

export function toView(row: WarehouseItem): WarehouseItemView {
  return {
    id: row.id,
    kind: row.kind,
    ref: row.ref,
    quantity: Number(row.quantity),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function notFound(itemId: number, warehouseId: number): NotFoundException {
  return new NotFoundException(`Позиция ${itemId} на складе ${warehouseId} не найдена`);
}

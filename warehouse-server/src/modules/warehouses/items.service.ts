import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type { AuthUser } from '~/auth/auth-user';
import { DB, type Database } from '~/db/db.module';
import { type WarehouseItem, type WarehouseItemKind, warehouseItems, warehouses } from '~/db/schema';
import { canIssueFrom, canMoveItems } from './access';
import { CompanyClient } from './company.client';
import type { ItemTake, WarehouseItemInput } from './items.dto';
import { WarehousesService } from './warehouses.service';

/** Транзакция Drizzle — тот же Database, но внутри db.transaction(). */
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Количество наружу — числом: в базе numeric, а pg отдаёт его строкой. */
export type WarehouseItemView = {
  id: number;
  kind: WarehouseItemKind;
  ref: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Позиция на руках: из какой компании выдана — одного человека выдают несколько компаний. */
export type HoldingItemView = WarehouseItemView & { warehouseId: number; companyId: number };

/** Имя «рук» в базе обязательно, но наружу не показывается: клиент подписывает их сам. */
const HOLDING_NAME = 'holding';

/**
 * Содержимое склада ведёт любой, кому склад виден: владелец, назначенные и own/manage
 * компании. Отдельного права «кладовщик» нет — назначение на склад и есть оно.
 * Исключение — «руки»: держатель их только видит, ведут own/manage (access.ts).
 */
@Injectable()
export class WarehouseItemsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly warehouses: WarehousesService,
    private readonly companies: CompanyClient,
  ) {}

  /**
   * Всё, что у спрашивающего на руках, одним списком из всех компаний. Только своё: чужие
   * руки компания смотрит как склад (GET /warehouses/:id/items).
   */
  async mine(user: AuthUser): Promise<HoldingItemView[]> {
    const rows = await this.db
      .select({ item: warehouseItems, companyId: warehouses.companyId })
      .from(warehouseItems)
      .innerJoin(warehouses, eq(warehouses.id, warehouseItems.warehouseId))
      .where(eq(warehouses.holderUserId, user.id))
      .orderBy(asc(warehouseItems.kind), asc(warehouseItems.ref), asc(warehouses.companyId));
    return rows.map(({ item, companyId }) => ({
      ...toView(item),
      warehouseId: item.warehouseId,
      // holder_user_id без компании не бывает (CHECK warehouses_holder_in_company).
      companyId: companyId as number,
    }));
  }

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
    await this.warehouses.editable(warehouseId, user);

    return this.db.transaction(async (tx) => {
      const saved: WarehouseItem[] = [];
      // По одной: у одной позиции в пачке может быть несколько строк (разные этапы
      // заявки), и вставка списком с onConflict сложила бы только последнюю.
      for (const item of items) saved.push(await put(tx, warehouseId, item.kind, item.ref, item.quantity));
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
    await this.warehouses.editable(warehouseId, user);
    const [row] = await this.db
      .update(warehouseItems)
      .set({ quantity: String(quantity) })
      .where(and(eq(warehouseItems.warehouseId, warehouseId), eq(warehouseItems.id, itemId)))
      .returning();
    if (!row) throw notFound(itemId, warehouseId);
    return toView(row);
  }

  async remove(warehouseId: number, itemId: number, user: AuthUser): Promise<void> {
    await this.warehouses.editable(warehouseId, user);
    const deleted = await this.db
      .delete(warehouseItems)
      .where(and(eq(warehouseItems.warehouseId, warehouseId), eq(warehouseItems.id, itemId)))
      .returning({ id: warehouseItems.id });
    if (deleted.length === 0) throw notFound(itemId, warehouseId);
  }

  /**
   * Групповые действия. Все выбранные позиции обязаны лежать на этом складе: хоть одной
   * нет (удалили в соседней вкладке) — 404 и откат, а не «удалили часть и промолчали».
   * Взять можно часть количества: остаток остаётся лежать, всё — строка уходит.
   */
  async removeMany(warehouseId: number, takes: ItemTake[], user: AuthUser): Promise<void> {
    await this.warehouses.editable(warehouseId, user);
    await this.db.transaction(async (tx) => {
      await this.take(tx, warehouseId, takes);
    });
  }

  /**
   * Переложить позиции на другой склад: на нём та же позиция складывается с лежащей
   * (как при добавлении из заявки). Одной транзакцией — иначе при обрыве количество
   * оказалось бы на обоих складах или ни на одном. С «рук» на склад — это возврат.
   */
  async move(
    warehouseId: number,
    takes: ItemTake[],
    targetId: number,
    user: AuthUser,
  ): Promise<WarehouseItemView[]> {
    // Оба склада должны быть видны: чужой — 404, как везде.
    const [from, to] = await Promise.all([
      this.warehouses.editable(warehouseId, user),
      this.warehouses.byId(targetId, user),
    ]);
    if (!canMoveItems(from, to)) {
      throw new BadRequestException('Перемещать можно только на другой действующий склад той же компании');
    }

    return this.db.transaction(async (tx) => {
      const taken = await this.take(tx, warehouseId, takes);
      const saved: WarehouseItem[] = [];
      for (const { row, take } of taken) saved.push(await put(tx, targetId, row.kind, row.ref, take));
      return saved.map(toView);
    });
  }

  /**
   * Выдать на руки участнику компании склада. Выдаёт тот, кто ведёт содержимое склада
   * (назначенный кладовщик тоже), получатель — любой участник, в том числе сам выдающий.
   * «Руки» заводятся при первой выдаче: заранее на каждого участника их никто не создаёт.
   * Списание со склада и зачисление на руки — одна транзакция, как у перемещения.
   */
  async issue(
    warehouseId: number,
    takes: ItemTake[],
    holderId: number,
    user: AuthUser,
  ): Promise<HoldingItemView[]> {
    const from = await this.warehouses.editable(warehouseId, user);
    if (!canIssueFrom(from) || from.companyId === null) {
      throw new BadRequestException('Выдавать на руки можно только со склада компании');
    }
    const companyId = from.companyId;
    // Состав смотрим глазами выдающего: участник видит участников своей компании.
    if (!(await this.companies.isMember(companyId, holderId, user))) {
      throw new BadRequestException(`Пользователь ${holderId} не участник компании склада`);
    }

    return this.db.transaction(async (tx) => {
      const holdingId = await holdingOf(tx, companyId, holderId, user.id);
      const taken = await this.take(tx, warehouseId, takes);
      const saved: WarehouseItem[] = [];
      for (const { row, take } of taken) saved.push(await put(tx, holdingId, row.kind, row.ref, take));
      return saved.map((row) => ({ ...toView(row), warehouseId: holdingId, companyId }));
    });
  }

  /**
   * Снять количество со склада внутри транзакции. Строки — FOR UPDATE: две вкладки,
   * снимающие одну позицию, иначе обе прочли бы «5» и увели бы вместе десять.
   */
  private async take(tx: Transaction, warehouseId: number, takes: ItemTake[]) {
    const rows = await tx
      .select()
      .from(warehouseItems)
      .where(
        and(
          eq(warehouseItems.warehouseId, warehouseId),
          inArray(
            warehouseItems.id,
            takes.map((take) => take.id),
          ),
        ),
      )
      .for('update');

    const plan = planTakes(rows, takes, warehouseId);
    for (const { row, rest } of plan) {
      if (rest === 0) {
        await tx.delete(warehouseItems).where(eq(warehouseItems.id, row.id));
      } else {
        await tx
          .update(warehouseItems)
          .set({ quantity: String(rest), updatedAt: new Date() })
          .where(eq(warehouseItems.id, row.id));
      }
    }
    return plan;
  }
}

/** Положить на склад; та же позиция складывается с лежащей, а не заводит вторую строку. */
async function put(
  tx: Transaction,
  warehouseId: number,
  kind: WarehouseItemKind,
  ref: string,
  quantity: number,
): Promise<WarehouseItem> {
  const [row] = await tx
    .insert(warehouseItems)
    .values({ warehouseId, kind, ref, quantity: String(quantity) })
    .onConflictDoUpdate({
      target: [warehouseItems.warehouseId, warehouseItems.kind, warehouseItems.ref],
      set: {
        quantity: sql`${warehouseItems.quantity} + ${String(quantity)}`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

/**
 * id «рук» человека в компании; нет — заводим. Две первые выдачи одному человеку разом
 * упрутся в warehouses_holder_uq: вторая ничего не вставит и прочтёт заведённые первой.
 */
async function holdingOf(tx: Transaction, companyId: number, holderId: number, issuerId: number) {
  await tx
    .insert(warehouses)
    .values({ ownerId: issuerId, companyId, holderUserId: holderId, name: HOLDING_NAME })
    .onConflictDoNothing({ target: [warehouses.companyId, warehouses.holderUserId] });
  const [row] = await tx
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(and(eq(warehouses.companyId, companyId), eq(warehouses.holderUserId, holderId)))
    .limit(1);
  return row.id;
}

/** Количество в базе — numeric(14, 4): считаем в десятитысячных, чтобы 0.3 − 0.1 не дало хвост. */
const SCALE = 10_000;

/**
 * Сколько снять с каждой строки и сколько на ней останется. Строки нет на складе —
 * 404, просят больше, чем лежит, — 400: молча урезать до лежащего значило бы
 * переместить или списать не то, что человек видел в форме.
 */
export function planTakes(
  rows: WarehouseItem[],
  takes: ItemTake[],
  warehouseId: number,
): { row: WarehouseItem; take: number; rest: number }[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const absent = takes.filter((take) => !byId.has(take.id)).map((take) => take.id);
  if (absent.length) {
    throw new NotFoundException(`Позиций ${absent.join(', ')} на складе ${warehouseId} нет`);
  }

  return takes.map((take) => {
    const row = byId.get(take.id) as WarehouseItem;
    const have = Math.round(Number(row.quantity) * SCALE);
    const want = Math.round(take.quantity * SCALE);
    if (want > have) {
      throw new BadRequestException(
        `Позиции ${row.id}: просят ${take.quantity}, лежит ${Number(row.quantity)}`,
      );
    }
    return { row, take: want / SCALE, rest: (have - want) / SCALE };
  });
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

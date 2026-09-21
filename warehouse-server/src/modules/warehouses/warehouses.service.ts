import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';

import type { AuthUser } from '~/auth/auth-user';
import { type Page, toPage } from '~/common/pagination';
import { DB, type Database } from '~/db/db.module';
import {
  WAREHOUSE_ITEM_KINDS,
  type Warehouse,
  type WarehouseItemKind,
  warehouseItems,
  warehouses,
  warehouseUsers,
} from '~/db/schema';
import { canAssign, canManage, canUnassign, canView, managesCompany, type WarehouseActor } from './access';
import { CompanyClient } from './company.client';
import type { CreateWarehouseDto, UpdateWarehouseDto, WarehouseQuery } from './warehouses.dto';

export type AssignedUser = { userId: number; createdAt: Date };

/** Сколько наименований каждого вида лежит на складе (не количество, а строк). */
export type ItemCounts = Record<WarehouseItemKind, number>;
export type WarehouseView = Warehouse & { counts: ItemCounts };

export type ItemCountRow = { warehouseId: number; kind: WarehouseItemKind; value: number };

/** Отдельно от запроса — чистая склейка, её и проверяют тесты. */
export function withCounts(rows: Warehouse[], counts: ItemCountRow[]): WarehouseView[] {
  const byWarehouse = new Map<number, ItemCounts>();
  for (const row of counts) {
    const current = byWarehouse.get(row.warehouseId) ?? emptyCounts();
    current[row.kind] = Number(row.value);
    byWarehouse.set(row.warehouseId, current);
  }
  return rows.map((warehouse) => ({
    ...warehouse,
    counts: byWarehouse.get(warehouse.id) ?? emptyCounts(),
  }));
}

function emptyCounts(): ItemCounts {
  return Object.fromEntries(WAREHOUSE_ITEM_KINDS.map((kind) => [kind, 0])) as ItemCounts;
}

/**
 * Склад заводит пользователь, принадлежать он может компании (company_id), а видят его
 * ещё назначенные пользователи. Права — access.ts; роли в компании — у company-server.
 *
 * Список без фильтра — свои и назначенные, у админа тоже: иначе его собственные тонули
 * бы в чужих. С ?companyId= own/manage компании получают все её склады.
 */
@Injectable()
export class WarehousesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly companies: CompanyClient,
  ) {}

  async list(query: WarehouseQuery, user: AuthUser): Promise<Page<WarehouseView>> {
    const where = and(
      await this.listScope(query.companyId, user),
      stateFilter(query.state),
      searchFilter(query.q),
    );

    const [items, [totals]] = await Promise.all([
      this.db
        .select()
        .from(warehouses)
        .where(where)
        .orderBy(asc(warehouses.name), asc(warehouses.id))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db.select({ value: count() }).from(warehouses).where(where),
    ]);

    return toPage(await this.itemCounts(items), Number(totals?.value ?? 0), query);
  }

  /**
   * Счётчики содержимого для страницы списка — одним группировочным запросом по id
   * этой страницы (их максимум limit=200). Идёт по индексу warehouse_items_ref_uq
   * (warehouse_id — его первая колонка), так что стоит примерно как сам список.
   */
  private async itemCounts(rows: Warehouse[]): Promise<WarehouseView[]> {
    if (!rows.length) return [];
    const counts = await this.db
      .select({
        warehouseId: warehouseItems.warehouseId,
        kind: warehouseItems.kind,
        value: count(),
      })
      .from(warehouseItems)
      .where(
        inArray(
          warehouseItems.warehouseId,
          rows.map((row) => row.id),
        ),
      )
      .groupBy(warehouseItems.warehouseId, warehouseItems.kind);
    return withCounts(rows, counts);
  }

  async byId(id: number, user: AuthUser): Promise<Warehouse> {
    return (await this.visible(id, user)).warehouse;
  }

  async create(dto: CreateWarehouseDto, user: AuthUser): Promise<Warehouse> {
    if (dto.companyId) await this.assertManagesCompany(dto.companyId, user);
    const [row] = await this.db
      .insert(warehouses)
      .values({ ...dto, ownerId: user.id })
      .returning();
    return row;
  }

  async update(id: number, dto: UpdateWarehouseDto, user: AuthUser): Promise<Warehouse> {
    const { warehouse, actor } = await this.managed(id, user);
    if (dto.companyId !== undefined && dto.companyId !== warehouse.companyId) {
      await this.assertCanMove(warehouse, actor, dto.companyId);
    }
    // Пустое тело — не ошибка, но и UPDATE без SET Drizzle не соберёт.
    if (Object.keys(dto).length === 0) return warehouse;
    return this.set(id, dto);
  }

  async archive(id: number, user: AuthUser): Promise<Warehouse> {
    await this.managed(id, user);
    return this.set(id, { isActive: false });
  }

  async restore(id: number, user: AuthUser): Promise<Warehouse> {
    await this.managed(id, user);
    return this.set(id, { isActive: true });
  }

  /** Связи уходят вместе со складом (ON DELETE CASCADE). */
  async remove(id: number, user: AuthUser): Promise<void> {
    await this.managed(id, user);
    await this.db.delete(warehouses).where(eq(warehouses.id, id));
  }

  /* ------------------------------------------------------------ назначенные */

  async users(id: number, user: AuthUser): Promise<AssignedUser[]> {
    await this.visible(id, user);
    return this.db
      .select({ userId: warehouseUsers.userId, createdAt: warehouseUsers.createdAt })
      .from(warehouseUsers)
      .where(eq(warehouseUsers.warehouseId, id))
      .orderBy(asc(warehouseUsers.createdAt), asc(warehouseUsers.userId));
  }

  /**
   * Назначить пользователя на склад; повторно — не ошибка, отвечает прежним назначением.
   * Назначает own/manage компании склада, назначить можно только её участника.
   */
  async assign(id: number, userId: number, user: AuthUser): Promise<AssignedUser> {
    // id пользователя из user-server — identity с единицы.
    if (userId <= 0) throw new BadRequestException('userId — положительное целое');
    const { warehouse, actor } = await this.visible(id, user);
    if (!warehouse.companyId) {
      throw new ConflictException({
        error: 'personal_warehouse',
        message: 'Склад личный: назначать пользователей можно на склад компании',
      });
    }
    if (!canAssign(actor)) {
      throw new ForbiddenException('Назначать на склад может владелец или управляющий компании склада');
    }
    // Смотрим состав глазами назначающего: он own/manage, так что участников видит.
    if (!(await this.companies.isMember(warehouse.companyId, userId, user))) {
      throw new BadRequestException(`Пользователь ${userId} не участник компании склада`);
    }

    await this.db.insert(warehouseUsers).values({ warehouseId: id, userId }).onConflictDoNothing();
    const [row] = await this.db
      .select({ userId: warehouseUsers.userId, createdAt: warehouseUsers.createdAt })
      .from(warehouseUsers)
      .where(and(eq(warehouseUsers.warehouseId, id), eq(warehouseUsers.userId, userId)));
    // Между вставкой и чтением склад могли снести физически.
    if (!row) throw notFound(id);
    return row;
  }

  /** Снять с назначения; свой id — отказаться от склада самому. */
  async unassign(id: number, userId: number, user: AuthUser): Promise<void> {
    const { actor } = await this.visible(id, user);
    if (!canUnassign(actor, userId)) {
      throw new ForbiddenException('Снимать с назначения может владелец или управляющий компании склада');
    }

    const deleted = await this.db
      .delete(warehouseUsers)
      .where(and(eq(warehouseUsers.warehouseId, id), eq(warehouseUsers.userId, userId)))
      .returning({ userId: warehouseUsers.userId });
    if (deleted.length === 0) throw new NotFoundException(`Пользователь ${userId} на склад ${id} не назначен`);
  }

  /* ---------------------------------------------------------------- доступ */

  /** Склад и то, кем ему приходится спрашивающий; невидимый — 404. */
  private async visible(id: number, user: AuthUser): Promise<{ warehouse: Warehouse; actor: WarehouseActor }> {
    const [warehouse] = await this.db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);
    if (!warehouse) throw notFound(id);

    const [link] = await this.db
      .select({ userId: warehouseUsers.userId })
      .from(warehouseUsers)
      .where(and(eq(warehouseUsers.warehouseId, id), eq(warehouseUsers.userId, user.id)))
      .limit(1);

    // Админу роли в компании не нужны — ему и так можно всё (access.ts).
    const companyRoles =
      warehouse.companyId && user.role !== 'ADMIN'
        ? await this.companies.rolesOf(warehouse.companyId, user)
        : [];

    const actor: WarehouseActor = {
      user,
      isOwner: warehouse.ownerId === user.id,
      isAssigned: !!link,
      companyRoles,
    };
    if (!canView(actor)) throw notFound(id);
    return { warehouse, actor };
  }

  /** Видимый и управляемый: назначенному, который склад и так видит, — 403. */
  private async managed(id: number, user: AuthUser): Promise<{ warehouse: Warehouse; actor: WarehouseActor }> {
    const visible = await this.visible(id, user);
    if (!canManage(visible.actor)) throw forbidden();
    return visible;
  }

  /**
   * Какие склады попадают в список. Свои и назначенные — всегда; с ?companyId= own/manage
   * компании видят все её склады, остальные — свои и назначенные среди них.
   */
  private async listScope(companyId: number | undefined, user: AuthUser): Promise<SQL | undefined> {
    const assigned = this.db
      .select({ id: warehouseUsers.warehouseId })
      .from(warehouseUsers)
      .where(eq(warehouseUsers.userId, user.id));
    const mine = or(eq(warehouses.ownerId, user.id), inArray(warehouses.id, assigned));
    if (!companyId) return mine;

    const inCompany = eq(warehouses.companyId, companyId);
    const roles = user.role === 'ADMIN' ? [] : await this.companies.rolesOf(companyId, user);
    return managesCompany(user, roles) ? inCompany : and(inCompany, mine);
  }

  private async assertManagesCompany(companyId: number, user: AuthUser): Promise<void> {
    const roles = user.role === 'ADMIN' ? [] : await this.companies.rolesOf(companyId, user);
    if (!managesCompany(user, roles)) {
      throw new ForbiddenException(`Склады компании ${companyId} заводит её владелец или управляющий`);
    }
  }

  /**
   * Перенос склада в другую компанию или из неё. Увести склад из компании может только
   * её own/manage — создатель склада сам по себе не может. Назначенные — участники прежней
   * компании, в новой их может не быть, поэтому переносить можно только без назначенных.
   */
  private async assertCanMove(warehouse: Warehouse, actor: WarehouseActor, to: number | null): Promise<void> {
    if (warehouse.companyId && !canAssign(actor)) {
      throw new ForbiddenException('Увести склад из компании может её владелец или управляющий');
    }
    if (to) await this.assertManagesCompany(to, actor.user);

    const [assigned] = await this.db
      .select({ value: count() })
      .from(warehouseUsers)
      .where(eq(warehouseUsers.warehouseId, warehouse.id));
    if (assigned?.value) {
      throw new ConflictException({
        error: 'has_assigned_users',
        message: 'На складе есть назначенные пользователи — сначала снимите их, потом меняйте компанию',
      });
    }
  }

  private async set(id: number, patch: Partial<typeof warehouses.$inferInsert>): Promise<Warehouse> {
    const [row] = await this.db.update(warehouses).set(patch).where(eq(warehouses.id, id)).returning();
    // Между проверкой и записью склад могли снести физически.
    if (!row) throw notFound(id);
    return row;
  }
}

function notFound(id: number): NotFoundException {
  return new NotFoundException(`Склад ${id} не найден`);
}

function forbidden(): ForbiddenException {
  return new ForbiddenException('Править склад может его создатель или владелец и управляющий его компании');
}

function stateFilter(state: WarehouseQuery['state']): SQL | undefined {
  if (state === 'active') return eq(warehouses.isActive, true);
  if (state === 'archived') return eq(warehouses.isActive, false);
  return undefined;
}

function searchFilter(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const pattern = `%${q}%`;
  return or(ilike(warehouses.name, pattern), ilike(warehouses.address, pattern));
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm';

import type { AuthUser } from '~/auth/auth-user';
import { type ListQuery, type Page, toPage } from '~/common/pagination';
import { DB, type Database } from '~/db/db.module';
import { type Warehouse, warehouses } from '~/db/schema';
import type { CreateWarehouseDto, UpdateWarehouseDto } from './warehouses.dto';

/**
 * Склад принадлежит тому, кто его завёл, — «общих» складов, как в словаре, нет.
 *
 * Список — только свои, и у админа тоже: иначе его собственные склады тонули бы
 * в чужих. По id админ достаёт и правит любой — для разбора обращений.
 * Чужой склад остальным — 404, а не 403: незачем подтверждать, что такой есть.
 */
export function canAccess(row: Pick<Warehouse, 'ownerId'>, user: AuthUser): boolean {
  return user.role === 'ADMIN' || row.ownerId === user.id;
}

@Injectable()
export class WarehousesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: ListQuery, user: AuthUser): Promise<Page<Warehouse>> {
    const where = and(eq(warehouses.ownerId, user.id), stateFilter(query.state), searchFilter(query.q));

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

    return toPage(items, Number(totals?.value ?? 0), query);
  }

  async byId(id: number, user: AuthUser): Promise<Warehouse> {
    const [row] = await this.db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);
    if (!row || !canAccess(row, user)) throw new NotFoundException(`Склад ${id} не найден`);
    return row;
  }

  async create(dto: CreateWarehouseDto, user: AuthUser): Promise<Warehouse> {
    const [row] = await this.db
      .insert(warehouses)
      .values({ ...dto, ownerId: user.id })
      .returning();
    return row;
  }

  async update(id: number, dto: UpdateWarehouseDto, user: AuthUser): Promise<Warehouse> {
    await this.byId(id, user);
    // Пустое тело — не ошибка, но и UPDATE без SET Drizzle не соберёт.
    if (Object.keys(dto).length === 0) return this.byId(id, user);
    return this.set(id, dto);
  }

  archive(id: number, user: AuthUser): Promise<Warehouse> {
    return this.byId(id, user).then(() => this.set(id, { isActive: false }));
  }

  restore(id: number, user: AuthUser): Promise<Warehouse> {
    return this.byId(id, user).then(() => this.set(id, { isActive: true }));
  }

  async remove(id: number, user: AuthUser): Promise<void> {
    await this.byId(id, user);
    await this.db.delete(warehouses).where(eq(warehouses.id, id));
  }

  private async set(id: number, patch: Partial<typeof warehouses.$inferInsert>): Promise<Warehouse> {
    const [row] = await this.db.update(warehouses).set(patch).where(eq(warehouses.id, id)).returning();
    // Между проверкой и записью склад могли снести физически.
    if (!row) throw new NotFoundException(`Склад ${id} не найден`);
    return row;
  }
}

function stateFilter(state: ListQuery['state']): SQL | undefined {
  if (state === 'active') return eq(warehouses.isActive, true);
  if (state === 'archived') return eq(warehouses.isActive, false);
  return undefined;
}

function searchFilter(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const pattern = `%${q}%`;
  return or(ilike(warehouses.name, pattern), ilike(warehouses.address, pattern));
}

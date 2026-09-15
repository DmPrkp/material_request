import { NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

import type { Database } from '~/db/db.module';
import { ResourceInUseException } from './errors';
import { toPage, type ListQuery, type Page } from './pagination';

/** Таблица справочника: id + is_active + произвольные колонки. */
type DictTable = PgTableWithColumns<any> & {
  id: PgColumn<any>;
  isActive: PgColumn<any>;
};

/** Откуда могут прилететь ссылки, мешающие физическому удалению. */
export type ReferenceCheck = {
  /** Как назвать источник ссылок в ответе 409. */
  label: string;
  table: PgTableWithColumns<any>;
  column: PgColumn<any>;
};

/**
 * Общий CRUD для таблиц справочника.
 *
 * Удаление по умолчанию мягкое: is_active = false. Физическое — только если
 * явно попросили и внутри словаря на позицию никто не ссылается.
 */
export class CrudService<TRow extends { id: number }> {
  constructor(
    protected readonly db: Database,
    protected readonly table: DictTable,
    /** Колонки, по которым работает ?q= */
    protected readonly searchable: PgColumn<any>[] = [],
    /** Колонка (или выражение — coalesce двух языков) для сортировки по умолчанию. */
    protected readonly orderBy: PgColumn<any> | SQL = table.id,
    /** Что проверять перед физическим удалением. */
    protected readonly references: ReferenceCheck[] = [],
  ) {}

  protected stateFilter(state: ListQuery['state']): SQL | undefined {
    if (state === 'active') return eq(this.table.isActive, true);
    if (state === 'archived') return eq(this.table.isActive, false);
    return undefined;
  }

  protected searchFilter(q: string | undefined): SQL | undefined {
    if (!q || this.searchable.length === 0) return undefined;
    const pattern = `%${q}%`;
    return or(...this.searchable.map((column) => ilike(column, pattern)));
  }

  async list(query: ListQuery): Promise<Page<TRow>> {
    const where = and(this.stateFilter(query.state), this.searchFilter(query.q));

    const [items, [totals]] = await Promise.all([
      this.db
        .select()
        .from(this.table)
        .where(where)
        .orderBy(asc(this.orderBy))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db.select({ value: count() }).from(this.table).where(where),
    ]);

    return toPage(items as TRow[], Number(totals?.value ?? 0), query);
  }

  async byId(id: number): Promise<TRow> {
    const [row] = await this.db.select().from(this.table).where(eq(this.table.id, id)).limit(1);
    if (!row) throw new NotFoundException(`Запись ${id} не найдена`);
    return row as TRow;
  }

  async create(data: Record<string, unknown>): Promise<TRow> {
    const [row] = await this.db.insert(this.table).values(data).returning();
    return row as TRow;
  }

  async update(id: number, data: Record<string, unknown>): Promise<TRow> {
    await this.byId(id);
    const [row] = await this.db.update(this.table).set(data).where(eq(this.table.id, id)).returning();
    return row;
  }

  /** Мягкое удаление: позиция исчезает из выдачи, но старые расчёты не ломаются. */
  async archive(id: number): Promise<TRow> {
    await this.byId(id);
    const [row] = await this.db
      .update(this.table)
      .set({ isActive: false })
      .where(eq(this.table.id, id))
      .returning();
    return row;
  }

  async restore(id: number): Promise<TRow> {
    await this.byId(id);
    const [row] = await this.db
      .update(this.table)
      .set({ isActive: true })
      .where(eq(this.table.id, id))
      .returning();
    return row;
  }

  /** Физическое удаление. Падает с 409, если внутри словаря есть ссылки. */
  async remove(id: number): Promise<void> {
    await this.byId(id);

    const blockedBy: Record<string, number> = {};
    for (const ref of this.references) {
      const [row] = await this.db.select({ value: count() }).from(ref.table).where(eq(ref.column, id));
      const found = Number(row?.value ?? 0);
      if (found > 0) blockedBy[ref.label] = found;
    }

    if (Object.keys(blockedBy).length > 0) throw new ResourceInUseException(blockedBy);

    await this.db.delete(this.table).where(eq(this.table.id, id));
  }
}

import { NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

import type { AuthUser } from '~/auth/jwt-payload';
import type { Database } from '~/db/db.module';
import { ResourceInUseException } from './errors';
import {
  assertCanModify,
  authorshipFor,
  canModify,
  canSee,
  copyable,
  visibleTo,
  type Owned,
  type OwnedColumns,
} from './ownership';
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
 *
 * У таблиц с автором (createdBy + isShared, authorship в schema.ts) всё завязано на
 * того, кто спрашивает, — правила в common/ownership.ts. user — из токена; undefined —
 * аноним или справочник без автора, тогда правила не применяются.
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

  /** Колонки автора, если они у таблицы есть: по ним и решается, кому что видно. */
  protected get owned(): OwnedColumns | undefined {
    return 'isShared' in this.table ? (this.table as unknown as OwnedColumns) : undefined;
  }

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

  /** Чужие личные позиции в выдачу не попадают — ни в список, ни в счётчик страниц. */
  protected visibility(user: AuthUser | undefined): SQL | undefined {
    return this.owned ? visibleTo(this.owned, user) : undefined;
  }

  /** extra — фильтр ресурса поверх общих state и ?q= (питание у электроинструмента). */
  async list(query: ListQuery, user: AuthUser | undefined, extra?: SQL): Promise<Page<TRow>> {
    const where = and(this.stateFilter(query.state), this.searchFilter(query.q), this.visibility(user), extra);

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

  /** Чужое личное — 404, а не 403: незачем подтверждать, что такая позиция есть. */
  async byId(id: number, user?: AuthUser): Promise<TRow> {
    const [row] = await this.db.select().from(this.table).where(eq(this.table.id, id)).limit(1);
    if (!row || (this.owned && !canSee(row as Owned, user))) {
      throw new NotFoundException(`Запись ${id} не найдена`);
    }
    return row;
  }

  /** Автор из токена; createdBy и isShared из тела не принимаются (схемы их отрезают). */
  protected withAuthor(data: Record<string, unknown>, user: AuthUser | undefined): Record<string, unknown> {
    if (!user) return data;
    return this.owned ? { ...data, ...authorshipFor(user) } : { ...data, createdBy: user.id };
  }

  async create(data: Record<string, unknown>, user?: AuthUser): Promise<TRow> {
    const [row] = await this.db.insert(this.table).values(this.withAuthor(data, user)).returning();
    return row as TRow;
  }

  /**
   * Своё (или что угодно у админа) правится на месте. Чужое общее у пользователя —
   * копией: оригинал остаётся у всех, а у него появляется своя позиция с правкой.
   * Вернётся копия с новым id — по нему клиент и понимает, что это была развилка.
   */
  async update(id: number, data: Record<string, unknown>, user?: AuthUser): Promise<TRow> {
    const current = await this.byId(id, user);
    if (this.owned && user && !canModify(current as unknown as Owned, user)) {
      return this.fork(current, data, user);
    }

    const [row] = await this.db.update(this.table).set(data).where(eq(this.table.id, id)).returning();
    return row;
  }

  /**
   * Копия чужой позиции для пользователя, сразу с его правкой. Наследники, у которых
   * к позиции прилагаются части (сборки, этапы), копируют и их, иначе копия вышла бы
   * пустой: без размеров материал в расчёт не идёт.
   */
  protected async fork(source: TRow, changes: Record<string, unknown>, user: AuthUser): Promise<TRow> {
    const [row] = await this.db
      .insert(this.table)
      .values({ ...copyable(source), ...changes, ...authorshipFor(user), isActive: true })
      .returning();
    return row as TRow;
  }

  /** Удалять и возвращать — только своё (админу — всё): чужую позицию копией не удалишь. */
  protected async modifiable(id: number, user: AuthUser | undefined): Promise<void> {
    const row = await this.byId(id, user);
    if (this.owned) assertCanModify(row as unknown as Owned, user);
  }

  /** Мягкое удаление: позиция исчезает из выдачи, но старые расчёты не ломаются. */
  async archive(id: number, user?: AuthUser): Promise<TRow> {
    await this.modifiable(id, user);
    const [row] = await this.db
      .update(this.table)
      .set({ isActive: false })
      .where(eq(this.table.id, id))
      .returning();
    return row;
  }

  async restore(id: number, user?: AuthUser): Promise<TRow> {
    await this.modifiable(id, user);
    const [row] = await this.db
      .update(this.table)
      .set({ isActive: true })
      .where(eq(this.table.id, id))
      .returning();
    return row;
  }

  /** Физическое удаление. Падает с 409, если внутри словаря есть ссылки. */
  async remove(id: number, user?: AuthUser): Promise<void> {
    await this.modifiable(id, user);

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

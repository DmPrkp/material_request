import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, max, sql } from 'drizzle-orm';

import { generateCode } from '~/common/code';
import { CrudService } from '~/common/crud.service';
import { toPage, type Page } from '~/common/pagination';
import { DB, type Database } from '~/db/db.module';
import { systems, workStages, workTypes } from '~/db/schema';
import type { SystemQueryDto, WorkStageQueryDto } from './structure.dto';

@Injectable()
export class WorkTypesService extends CrudService<typeof workTypes.$inferSelect> {
  constructor(@Inject(DB) db: Database) {
    super(db, workTypes, [workTypes.code, workTypes.nameRu, workTypes.nameEn], workTypes.id, [
      { label: 'systems', table: systems, column: systems.workTypeId },
    ]);
  }
}

@Injectable()
export class SystemsService extends CrudService<typeof systems.$inferSelect> {
  constructor(@Inject(DB) db: Database) {
    super(
      db,
      systems,
      [systems.title, systems.nameRu, systems.nameEn, systems.descriptionRu, systems.descriptionEn],
      systems.nameRu,
      [{ label: 'workStages', table: workStages, column: workStages.systemId }],
    );
  }

  /** С клиента приходят только названия — технический код title придумываем сами. */
  override create(data: Record<string, unknown>): Promise<typeof systems.$inferSelect> {
    return super.create({ ...data, title: data.title ?? generateCode(data.nameEn) });
  }

  async listByWorkType(query: SystemQueryDto): Promise<Page<typeof systems.$inferSelect>> {
    const where = and(
      this.stateFilter(query.state),
      this.searchFilter(query.q),
      query.workTypeId ? eq(systems.workTypeId, query.workTypeId) : undefined,
    );

    const [items, [totals]] = await Promise.all([
      this.db
        .select()
        .from(systems)
        .where(where)
        // Заведённые под /en без русского названия иначе уезжали бы в конец (NULL последним).
        .orderBy(sql`coalesce(${systems.nameRu}, ${systems.nameEn})`)
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db.select({ value: count() }).from(systems).where(where),
    ]);

    return toPage(items, Number(totals?.value ?? 0), query);
  }

  /** Раньше это жило в calc-server: GET /:workType/:system по названию системы. */
  async stagesBySystemTitle(title: string): Promise<(typeof workStages.$inferSelect)[]> {
    const [system] = await this.db.select().from(systems).where(eq(systems.title, title)).limit(1);
    if (!system) throw new NotFoundException(`Технология «${title}» не найдена`);

    return this.db
      .select()
      .from(workStages)
      .where(and(eq(workStages.systemId, system.id), eq(workStages.isActive, true)))
      .orderBy(asc(workStages.position));
  }
}

@Injectable()
export class WorkStagesService extends CrudService<typeof workStages.$inferSelect> {
  constructor(@Inject(DB) db: Database) {
    super(db, workStages, [workStages.title, workStages.nameRu, workStages.nameEn], workStages.position, []);
  }

  /**
   * Технический код title — как у технологии, придумываем сами.
   * Без position этап встаёт последним в своей системе: клиенту незачем знать нумерацию.
   */
  override async create(input: Record<string, unknown>): Promise<typeof workStages.$inferSelect> {
    // Тип явно: иначе spread Record<string, unknown> схлопывается в { title: {} }.
    const data: Record<string, unknown> = { ...input, title: input.title ?? generateCode(input.nameEn) };
    if (data.position !== undefined) return super.create(data);

    // Архивные этапы держат свои позиции (уникальный индекс их не различает),
    // поэтому max — по всем строкам системы, а не только по активным.
    const [row] = await this.db
      .select({ value: max(workStages.position) })
      .from(workStages)
      .where(eq(workStages.systemId, data.systemId as number));

    return super.create({ ...data, position: (row?.value ?? 0) + 1 });
  }

  async listBySystem(query: WorkStageQueryDto): Promise<Page<typeof workStages.$inferSelect>> {
    const where = and(
      this.stateFilter(query.state),
      this.searchFilter(query.q),
      query.systemId ? eq(workStages.systemId, query.systemId) : undefined,
    );

    const [items, [totals]] = await Promise.all([
      this.db
        .select()
        .from(workStages)
        .where(where)
        .orderBy(asc(workStages.systemId), asc(workStages.position))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db.select({ value: count() }).from(workStages).where(where),
    ]);

    return toPage(items, Number(totals?.value ?? 0), query);
  }
}

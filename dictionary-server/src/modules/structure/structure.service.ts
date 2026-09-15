import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, inArray, max, sql, type SQL } from 'drizzle-orm';

import type { AuthUser } from '~/auth/jwt-payload';
import { generateCode } from '~/common/code';
import { CrudService } from '~/common/crud.service';
import { authorshipFor, canModify, canSee, copyable, isAdmin, visibleTo } from '~/common/ownership';
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

  /**
   * Копии вида работ не бывает: его code — сегмент адреса на клиенте и уникален,
   * а два «Фасада» с разными адресами никому не нужны. Чужой вид правит только админ.
   */
  protected override fork(): Promise<typeof workTypes.$inferSelect> {
    throw new ForbiddenException('Вид работ правит только его автор или админ');
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
  override create(data: Record<string, unknown>, user?: AuthUser): Promise<typeof systems.$inferSelect> {
    return super.create({ ...data, title: data.title ?? generateCode(data.nameEn) }, user);
  }

  /**
   * Копия чужой технологии — вместе с этапами, иначе копия вышла бы пустой. Позиции
   * этапов те же: по ним клиент сопоставляет строки формы с этапами копии. title у
   * копий новые — они уникальны во всей таблице, а по ним ходит calc-server.
   */
  protected override fork(
    source: typeof systems.$inferSelect,
    changes: Record<string, unknown>,
    user: AuthUser,
  ): Promise<typeof systems.$inferSelect> {
    return this.db.transaction(async (tx) => {
      const values = { ...copyable(source), ...changes };
      const [system] = await tx
        .insert(systems)
        .values({
          ...(values as typeof systems.$inferInsert),
          title: generateCode(values.nameEn),
          ...authorshipFor(user),
          isActive: true,
        })
        .returning();

      const stages = await tx.select().from(workStages).where(eq(workStages.systemId, source.id));
      if (stages.length > 0) {
        await tx.insert(workStages).values(
          stages.map((stage) => ({
            ...(copyable(stage) as typeof workStages.$inferInsert),
            title: generateCode(stage.nameEn),
            systemId: system.id,
            createdBy: user.id,
          })),
        );
      }

      return system;
    });
  }

  async listByWorkType(
    query: SystemQueryDto,
    user: AuthUser | undefined,
  ): Promise<Page<typeof systems.$inferSelect>> {
    const where = and(
      this.stateFilter(query.state),
      this.searchFilter(query.q),
      this.visibility(user),
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

/**
 * Этапы — часть технологии, своих прав у них нет: видна технология — видны этапы,
 * правит технологию — правит и их. Поэтому is_shared у этапов нет, а чужие этапы
 * правятся только в копии технологии: клиент сначала сохраняет саму технологию
 * (PATCH /systems/:id заводит копию вместе с этапами), потом этапы копии.
 */
@Injectable()
export class WorkStagesService extends CrudService<typeof workStages.$inferSelect> {
  constructor(@Inject(DB) db: Database) {
    super(db, workStages, [workStages.title, workStages.nameRu, workStages.nameEn], workStages.position, []);
  }

  protected override visibility(user: AuthUser | undefined): SQL | undefined {
    if (isAdmin(user)) return undefined;
    return inArray(
      workStages.systemId,
      this.db.select({ id: systems.id }).from(systems).where(visibleTo(systems, user)),
    );
  }

  /** Технология этапа, если её видно; modify — ещё и право её править. */
  private async system(systemId: number, user: AuthUser | undefined, modify: boolean) {
    const [system] = await this.db.select().from(systems).where(eq(systems.id, systemId)).limit(1);
    if (!system || !canSee(system, user)) throw new NotFoundException(`Технология ${systemId} не найдена`);
    if (modify && !canModify(system, user)) {
      throw new ForbiddenException('Этапы чужой технологии правятся в её копии — сначала сохраните саму технологию');
    }
    return system;
  }

  override async byId(id: number, user?: AuthUser): Promise<typeof workStages.$inferSelect> {
    const stage = await super.byId(id, user);
    try {
      await this.system(stage.systemId, user, false);
    } catch {
      throw new NotFoundException(`Запись ${id} не найдена`);
    }
    return stage;
  }

  /**
   * Технический код title — как у технологии, придумываем сами.
   * Без position этап встаёт последним в своей системе: клиенту незачем знать нумерацию.
   */
  override async create(input: Record<string, unknown>, user?: AuthUser): Promise<typeof workStages.$inferSelect> {
    if (user) await this.system(input.systemId as number, user, true);

    // Тип явно: иначе spread Record<string, unknown> схлопывается в { title: {} }.
    const data: Record<string, unknown> = { ...input, title: input.title ?? generateCode(input.nameEn) };
    if (data.position !== undefined) return super.create(data, user);

    // Архивные этапы держат свои позиции (уникальный индекс их не различает),
    // поэтому max — по всем строкам системы, а не только по активным.
    const [row] = await this.db
      .select({ value: max(workStages.position) })
      .from(workStages)
      .where(eq(workStages.systemId, data.systemId as number));

    return super.create({ ...data, position: (row?.value ?? 0) + 1 }, user);
  }

  /** Перенос в другую технологию — только в свою: иначе этап подложили бы в чужую. */
  override async update(
    id: number,
    data: Record<string, unknown>,
    user?: AuthUser,
  ): Promise<typeof workStages.$inferSelect> {
    await this.assertModifiable(id, user);
    if (user && typeof data.systemId === 'number') await this.system(data.systemId, user, true);
    return super.update(id, data, user);
  }

  private async assertModifiable(id: number, user: AuthUser | undefined): Promise<void> {
    const stage = await this.byId(id, user);
    if (user) await this.system(stage.systemId, user, true);
  }

  override async archive(id: number, user?: AuthUser) {
    await this.assertModifiable(id, user);
    return super.archive(id, user);
  }

  override async restore(id: number, user?: AuthUser) {
    await this.assertModifiable(id, user);
    return super.restore(id, user);
  }

  override async remove(id: number, user?: AuthUser) {
    await this.assertModifiable(id, user);
    return super.remove(id, user);
  }

  async listBySystem(
    query: WorkStageQueryDto,
    user: AuthUser | undefined,
  ): Promise<Page<typeof workStages.$inferSelect>> {
    const where = and(
      this.stateFilter(query.state),
      this.searchFilter(query.q),
      this.visibility(user),
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

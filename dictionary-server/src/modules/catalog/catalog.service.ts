import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, countDistinct, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

import type { AuthUser } from '~/auth/auth-user';
import { CrudService } from '~/common/crud.service';
import { authorshipFor, canModify, type Owned } from '~/common/ownership';
import type { ListQuery } from '~/common/pagination';
import { toPage, type Page } from '~/common/pagination';
import { DB, type Database } from '~/db/db.module';
import {
  handToolVariantParams,
  handToolVariants,
  handTools,
  materialTypes,
  materialVariantParams,
  materialVariants,
  materials,
  powerTools,
  units,
} from '~/db/schema';
import type { MaterialQueryDto, PowerToolQueryDto, VariantParamInput } from './catalog.dto';
import { assertNamesFree, findNamesake, pickNames } from './unique-names';
import { VariantsService } from './variants.service';

/**
 * Сколько настоящих типоразмеров — с параметрами — у каждой позиции страницы.
 *
 * Одним запросом на страницу, а не N подзапросами: клиенту счётчик нужен, чтобы
 * не рисовать раскрывающую стрелку у позиций, у которых разворачивать нечего.
 *
 * Служебный вариант без параметров не в счёт: он есть у каждой позиции без размеров
 * (его code — просто id позиции), и пока его считали, «Деревянные щиты настила»
 * раскрывались ради одной строки «Без типоразмеров». Архивные (удалённые из формы
 * сборки) не в счёт тоже — клиент их не показывает, иначе стрелка и содержимое разошлись бы.
 */
async function countSizedVariants(
  db: Database,
  variants: PgTableWithColumns<any>,
  ownerColumn: PgColumn<any>,
  params: PgTableWithColumns<any>,
  ids: number[],
): Promise<Record<number, number>> {
  if (ids.length === 0) return {};

  const rows = await db
    .select({ ownerId: ownerColumn, value: countDistinct(variants.id) })
    .from(variants)
    .innerJoin(params, eq(params.variantId, variants.id))
    .where(and(inArray(ownerColumn, ids), eq(variants.isActive, true)))
    .groupBy(ownerColumn);

  return Object.fromEntries(rows.map((row) => [Number(row.ownerId), Number(row.value)]));
}

/**
 * Позиция заводится сразу со сборками, одной транзакцией: упади вторая сборка —
 * и не останется позиции с половиной размеров. Без параметров — одна служебная
 * сборка (code = id): она есть у каждой позиции без размеров, и нормам расхода
 * есть на что сослаться. Сама позиция (7) в расчёт не идёт — идут сборки (7:227).
 *
 * Название уникально среди того, что видит владелец (unique-names.ts): занято живой
 * позицией — 409. Совпало с его же удалённой — она и возвращается, с новыми полями
 * и сборками из запроса, а не заводится вторая с тем же именем.
 */
function createWithVariants(
  db: Database,
  variants: VariantsService,
  kind: 'hand-tool' | 'material',
  table: PgTableWithColumns<any>,
  label: string,
  data: Record<string, unknown>,
  user: AuthUser | undefined,
) {
  const { variants: sets = [], ...row } = data as { variants?: VariantParamInput[][] } & Record<
    string,
    unknown
  >;
  // Без пользователя (сиды, внутренние вызовы) позиция общая — как у сидов.
  const owner: Owned = user ? authorshipFor(user) : { createdBy: null, isShared: true };
  const names = pickNames(row);

  return db.transaction(async (tx) => {
    await assertNamesFree(tx, table as never, label, owner, names);

    const archived = await findNamesake(tx, table as never, owner, names, { active: false });
    if (archived) {
      const [restored] = await tx
        .update(table)
        .set({ ...row, isActive: true })
        .where(eq(table.id, archived.id))
        .returning();
      // У удалённой могло остаться второе название, которое с тех пор кто-то занял.
      await assertNamesFree(tx, table as never, label, owner, pickNames(restored), restored.id);
      // Пустой список — ничего не добавляем: сборки удалённой позиции живы и так.
      for (const params of sets) {
        try {
          await variants.create(kind, restored.id, { params }, tx);
        } catch (error) {
          // Такая сборка у неё уже есть — это не ошибка восстановления.
          if (!(error instanceof ConflictException)) throw error;
        }
      }
      return restored;
    }

    const [created] = await tx.insert(table).values(row).returning();
    for (const params of sets.length > 0 ? sets : [[]]) {
      await variants.create(kind, created.id, { params }, tx);
    }
    return created;
  });
}

@Injectable()
export class HandToolsService extends CrudService<typeof handTools.$inferSelect> {
  constructor(
    @Inject(DB) db: Database,
    private readonly variants: VariantsService,
  ) {
    // Заведённые под /en без русского названия иначе уезжали бы в конец (NULL последним).
    super(db, handTools, [handTools.nameRu, handTools.nameEn], sql`coalesce(${handTools.nameRu}, ${handTools.nameEn})`, [
      { label: 'variants', table: handToolVariants, column: handToolVariants.handToolId },
    ]);
  }

  override create(data: Record<string, unknown>, user?: AuthUser) {
    return createWithVariants(
      this.db,
      this.variants,
      'hand-tool',
      handTools,
      'Инструмент',
      this.withAuthor(data, user),
      user,
    ) as Promise<typeof handTools.$inferSelect>;
  }

  /** Переименование на месте — в свободное имя; чужое уходит в копию (fork), там своя проверка. */
  override async update(id: number, data: Record<string, unknown>, user?: AuthUser) {
    const current = await this.byId(id, user);
    if (!user || canModify(current, user)) {
      await assertNamesFree(this.db, handTools, 'Инструмент', current, pickNames(data), id);
    }
    return super.update(id, data, user);
  }

  /** Пока позиция лежала в удалённых, её имя могли занять. */
  override async restore(id: number, user?: AuthUser) {
    await this.modifiable(id, user);
    const row = await this.byId(id, user);
    await assertNamesFree(this.db, handTools, 'Инструмент', row, pickNames(row), id);
    return super.restore(id, user);
  }

  /** Копия чужого инструмента — вместе со сборками: без них в расчёт ей идти нечем. */
  protected override fork(source: typeof handTools.$inferSelect, changes: Record<string, unknown>, user: AuthUser) {
    return this.db.transaction(
      async (tx) => (await this.variants.forkOwner('hand-tool', source, changes, user, tx)).owner,
    ) as Promise<typeof handTools.$inferSelect>;
  }

  /** Тот же список, что и у базового CRUD, плюс число типоразмеров у позиции. */
  async listWithVariantCount(
    query: ListQuery,
    user: AuthUser | undefined,
  ): Promise<Page<Record<string, unknown>>> {
    const page = await this.list(query, user);
    const counts = await countSizedVariants(
      this.db,
      handToolVariants,
      handToolVariants.handToolId,
      handToolVariantParams,
      page.items.map((item) => item.id),
    );

    return {
      ...page,
      items: page.items.map((item) => ({ ...item, variantsCount: counts[item.id] ?? 0 })),
    };
  }
}

@Injectable()
export class PowerToolsService extends CrudService<typeof powerTools.$inferSelect> {
  constructor(@Inject(DB) db: Database) {
    super(db, powerTools, [powerTools.nameRu, powerTools.nameEn], powerTools.nameRu, []);
  }

  /** Табы на клиенте — сетевой и аккумуляторный; без corded — весь электроинструмент. */
  listByCurrent(query: PowerToolQueryDto, user: AuthUser | undefined) {
    return this.list(query, user, query.corded === undefined ? undefined : eq(powerTools.isCorded, query.corded));
  }

  /**
   * Электроинструмент по точным id — для норм расхода в calc-server, как
   * VariantsService.lookup для сборок. И по той же причине видимость не проверяется,
   * а архивные отдаются: спрашивают ссылки, которые у спрашивающего уже есть, и ответ
   * одинаков для всех — иначе расчёт зависел бы от того, кто считает. Чего нет — того в ответе нет, 404 не бросаем: норма на удалённую
   * позицию просто выпадает из расчёта.
   */
  lookup(ids: readonly number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(powerTools)
      .where(inArray(powerTools.id, [...ids]))
      .orderBy(asc(powerTools.id));
  }
}

@Injectable()
export class MaterialTypesService extends CrudService<typeof materialTypes.$inferSelect> {
  constructor(@Inject(DB) db: Database) {
    super(db, materialTypes, [materialTypes.code, materialTypes.nameRu, materialTypes.nameEn], materialTypes.nameRu, [
      { label: 'materials', table: materials, column: materials.typeId },
    ]);
  }
}

@Injectable()
export class MaterialsService extends CrudService<typeof materials.$inferSelect> {
  constructor(
    @Inject(DB) db: Database,
    private readonly variants: VariantsService,
  ) {
    super(db, materials, [materials.nameRu, materials.nameEn], materials.nameRu, [
      { label: 'variants', table: materialVariants, column: materialVariants.materialId },
    ]);
  }

  override create(data: Record<string, unknown>, user?: AuthUser) {
    return createWithVariants(
      this.db,
      this.variants,
      'material',
      materials,
      'Материал',
      this.withAuthor(data, user),
      user,
    ) as Promise<typeof materials.$inferSelect>;
  }

  /** Как у ручного инструмента: названия уникальны среди видимого владельцу. */
  override async update(id: number, data: Record<string, unknown>, user?: AuthUser) {
    const current = await this.byId(id, user);
    if (!user || canModify(current, user)) {
      await assertNamesFree(this.db, materials, 'Материал', current, pickNames(data), id);
    }
    return super.update(id, data, user);
  }

  override async restore(id: number, user?: AuthUser) {
    await this.modifiable(id, user);
    const row = await this.byId(id, user);
    await assertNamesFree(this.db, materials, 'Материал', row, pickNames(row), id);
    return super.restore(id, user);
  }

  /** Копия чужого материала — вместе со сборками, как у ручного инструмента. */
  protected override fork(source: typeof materials.$inferSelect, changes: Record<string, unknown>, user: AuthUser) {
    return this.db.transaction(
      async (tx) => (await this.variants.forkOwner('material', source, changes, user, tx)).owner,
    ) as Promise<typeof materials.$inferSelect>;
  }

  /** Материал без единицы измерения нечитаем — подмешиваем её и тип в список. */
  async listWithUnit(query: MaterialQueryDto, user: AuthUser | undefined): Promise<Page<Record<string, unknown>>> {
    const where = and(
      this.stateFilter(query.state),
      this.searchFilter(query.q),
      this.visibility(user),
      query.unitId ? eq(materials.unitId, query.unitId) : undefined,
      query.typeId ? eq(materials.typeId, query.typeId) : undefined,
      query.untyped ? isNull(materials.typeId) : undefined,
    );

    const [items, [totals]] = await Promise.all([
      this.db
        .select({
          id: materials.id,
          nameRu: materials.nameRu,
          nameEn: materials.nameEn,
          descriptionRu: materials.descriptionRu,
          descriptionEn: materials.descriptionEn,
          isActive: materials.isActive,
          createdBy: materials.createdBy,
          isShared: materials.isShared,
          unit: { id: units.id, code: units.code, nameRu: units.nameRu, nameEn: units.nameEn },
          // Тип необязателен — оставляем LEFT JOIN, иначе материалы без типа выпадут
          type: {
            id: materialTypes.id,
            code: materialTypes.code,
            nameRu: materialTypes.nameRu,
            nameEn: materialTypes.nameEn,
          },
        })
        .from(materials)
        .innerJoin(units, eq(materials.unitId, units.id))
        .leftJoin(materialTypes, eq(materials.typeId, materialTypes.id))
        .where(where)
        // Заведённые под /en без русского названия иначе уезжали бы в конец (NULL последним).
        .orderBy(sql`coalesce(${materials.nameRu}, ${materials.nameEn})`)
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db.select({ value: count() }).from(materials).where(where),
    ]);

    const counts = await countSizedVariants(
      this.db,
      materialVariants,
      materialVariants.materialId,
      materialVariantParams,
      items.map((item) => item.id),
    );

    return toPage(
      items.map((item) => ({ ...item, variantsCount: counts[item.id] ?? 0 })),
      Number(totals?.value ?? 0),
      query,
    );
  }
}

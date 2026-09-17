import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, isNull, ne, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

import type { AuthUser } from '~/auth/jwt-payload';
import { assertCanModify, authorshipFor, canModify, canSee, copyable, type Owned } from '~/common/ownership';
import { DB, type Database } from '~/db/db.module';
import {
  handToolVariantParams,
  handToolVariants,
  handTools,
  materialVariantParams,
  materialVariants,
  materials,
  paramKinds,
  paramValues,
  units,
} from '~/db/schema';
import type { VariantParamInput } from './catalog.dto';
import { forkNames } from './unique-names';
import { buildVariantCode } from './variant-code';

/** Транзакция drizzle: создание инструмента заводит его варианты в своей же транзакции. */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export type VariantParam = {
  paramValueId: number;
  value: string;
  unit: string;
  unitId: number;
  kind: string | null;
  /** id вида и единицы — форме правки, чтобы выставить селекты без сверки по коду. */
  kindId: number | null;
};

export type Variant = {
  id: number;
  code: string;
  ownerId: number;
  isActive: boolean;
  params: VariantParam[];
};

type VariantTables = {
  variants: PgTableWithColumns<any>;
  variantId: PgColumn<any>;
  variantCode: PgColumn<any>;
  variantOwner: PgColumn<any>;
  variantActive: PgColumn<any>;
  links: PgTableWithColumns<any>;
  linkVariantId: PgColumn<any>;
  linkParamValueId: PgColumn<any>;
  /** Имя поля-владельца в drizzle-модели — для insert(). */
  ownerKey: 'handToolId' | 'materialId';
  /** Таблица самой позиции — чтобы проверить, что владелец существует. */
  owner: PgTableWithColumns<any>;
  ownerId: PgColumn<any>;
  ownerLabel: string;
};

const HAND_TOOL: VariantTables = {
  variants: handToolVariants,
  variantId: handToolVariants.id,
  variantCode: handToolVariants.code,
  variantOwner: handToolVariants.handToolId,
  variantActive: handToolVariants.isActive,
  links: handToolVariantParams,
  linkVariantId: handToolVariantParams.variantId,
  linkParamValueId: handToolVariantParams.paramValueId,
  ownerKey: 'handToolId',
  owner: handTools,
  ownerId: handTools.id,
  ownerLabel: 'Инструмент',
};

const MATERIAL: VariantTables = {
  variants: materialVariants,
  variantId: materialVariants.id,
  variantCode: materialVariants.code,
  variantOwner: materialVariants.materialId,
  variantActive: materialVariants.isActive,
  links: materialVariantParams,
  linkVariantId: materialVariantParams.variantId,
  linkParamValueId: materialVariantParams.paramValueId,
  ownerKey: 'materialId',
  owner: materials,
  ownerId: materials.id,
  ownerLabel: 'Материал',
};

/** Параметры нового варианта: готовые id значений и/или тройки из формы. */
type VariantParamsSource = { paramValueIds?: readonly number[]; params?: readonly VariantParamInput[] };

/** Позиция, в которой пользователь правит сборки: своя — та же, чужая — его копия. */
type EditableOwner = {
  id: number;
  /** Только у копии: id сборки оригинала -> id её двойника в копии. */
  variantIds?: Map<number, number>;
};

/**
 * Сборки ручного инструмента и материалов.
 *
 * Своих прав у сборки нет — они целиком от позиции (common/ownership.ts): видна
 * позиция — видны сборки, правит позицию — правит и их. Правка сборки чужой общей
 * позиции заводит пользователю копию позиции со всеми сборками (forkOwner) и уже в
 * ней меняет двойника той сборки: в ответе у сборки другой ownerId.
 */
@Injectable()
export class VariantsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  private tables(kind: 'hand-tool' | 'material'): VariantTables {
    return kind === 'hand-tool' ? HAND_TOOL : MATERIAL;
  }

  /** Позиция, которую пользователю видно; чужая личная — 404, как и несуществующая. */
  private async visibleOwner(
    db: Database | Tx,
    t: VariantTables,
    ownerId: number,
    user: AuthUser | undefined,
  ): Promise<Record<string, unknown> & Owned & { id: number }> {
    const [owner] = await db.select().from(t.owner).where(eq(t.ownerId, ownerId)).limit(1);
    if (!owner || !canSee(owner as Owned, user)) {
      throw new NotFoundException(`${t.ownerLabel} ${ownerId} не найден`);
    }
    return owner as Record<string, unknown> & Owned & { id: number };
  }

  async listByOwner(
    kind: 'hand-tool' | 'material',
    ownerId: number,
    user: AuthUser | undefined,
  ): Promise<Variant[]> {
    const t = this.tables(kind);
    await this.visibleOwner(this.db, t, ownerId, user);
    return this.selectVariants(t, eq(t.variantOwner, ownerId));
  }

  /**
   * Сборки по списку id — вместе с названием позиции (у материала — и с единицей).
   * Внутренние ссылки словаря (копирование технологии, формы правки) ходят по id.
   */
  async byIds(kind: 'hand-tool' | 'material', ids: readonly number[]) {
    if (ids.length === 0) return [];
    return this.lookup(kind, inArray(this.tables(kind).variantId, [...ids]));
  }

  /**
   * То же самое, но по кодам: нормы расхода в calc-server ссылаются кодом сборки,
   * а не её id — правка параметров пересчитывает код, и норма от прежнего
   * типоразмера сюда просто не доедет (её строка выпадет из расчёта).
   */
  async byCodes(kind: 'hand-tool' | 'material', codes: readonly string[]) {
    if (codes.length === 0) return [];
    return this.lookup(kind, inArray(this.tables(kind).variantCode, [...codes]));
  }

  /**
   * Сборки по условию вместе с названием позиции. Архивные тоже отдаём — норма на
   * них может остаться.
   *
   * Видимость (canSee) здесь НЕ проверяется, в отличие от списков и поиска.
   * Разделение на «своё и общее» существует, чтобы заведённое одним человеком не
   * засоряло списки другому, — это про перечисление, а не про секретность. Здесь
   * же перечисления нет: спрашивают конкретные ссылки, которые у спрашивающего
   * уже есть (в нормах расхода), и ответ на них одинаков для всех. Благодаря
   * этому расчёт детерминирован и кэшируется одним ключом на всех.
   *
   * Правило: фильтруем перечисление, не фильтруем разрешение ссылки. Если в
   * справочнике однажды заведётся что-то действительно закрытое (скажем, цена
   * поставщика), это правило придётся пересматривать.
   */
  private async lookup(kind: 'hand-tool' | 'material', where: SQL) {
    const t = this.tables(kind);

    const variants = await this.selectVariants(t, where);
    const ownerIds = [...new Set(variants.map((variant) => variant.ownerId))];
    if (ownerIds.length === 0) return [];

    const owners = (await this.db.select().from(t.owner).where(inArray(t.ownerId, ownerIds))) as {
      id: number;
      nameRu: string | null;
      nameEn: string | null;
      unitId?: number;
    }[];
    const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

    const unitIds = [...new Set(owners.flatMap((owner) => (owner.unitId ? [owner.unitId] : [])))];
    const unitRows = unitIds.length
      ? await this.db
          .select({ id: units.id, code: units.code, nameRu: units.nameRu, nameEn: units.nameEn })
          .from(units)
          .where(inArray(units.id, unitIds))
      : [];
    const unitById = new Map(unitRows.map((unit) => [unit.id, unit]));

    return variants.flatMap((variant) => {
      const owner = ownerById.get(variant.ownerId);
      // Позиции нет разве что в гонке с удалением — сборка без названия бесполезна.
      if (!owner) return [];
      // Пару nameRu/nameEn LocalizeInterceptor свернёт в одно name.
      const base = { id: owner.id, nameRu: owner.nameRu, nameEn: owner.nameEn };
      const unit = owner.unitId ? (unitById.get(owner.unitId) ?? null) : undefined;
      return [{ ...variant, owner: unit === undefined ? base : { ...base, unit } }];
    });
  }

  /** Сборки с параметрами по условию; параметры внутри сборки — в порядке code. */
  private async selectVariants(t: VariantTables, where: SQL): Promise<Variant[]> {
    const rows = await this.db
      .select({
        id: t.variantId,
        code: t.variantCode,
        ownerId: t.variantOwner,
        isActive: t.variantActive,
        paramValueId: t.linkParamValueId,
        value: paramValues.value,
        unit: units.code,
        unitId: paramValues.unitId,
        kind: paramKinds.code,
        kindId: paramValues.kindId,
      })
      .from(t.variants)
      .leftJoin(t.links, eq(t.linkVariantId, t.variantId))
      .leftJoin(paramValues, eq(paramValues.id, t.linkParamValueId))
      .leftJoin(units, eq(units.id, paramValues.unitId))
      .leftJoin(paramKinds, eq(paramKinds.id, paramValues.kindId))
      .where(where)
      // Вторичная сортировка обязательна: без неё параметры внутри варианта
      // приходили в произвольном порядке и «Ø 8 мм × дл. 100 мм» иногда
      // читалось наоборот. По id значения порядок совпадает с тем, что зашит
      // в code варианта (диаметры имеют меньшие id, чем длины).
      .orderBy(asc(t.variantId), asc(t.linkParamValueId));

    const byId = new Map<number, Variant>();

    for (const row of rows) {
      let variant = byId.get(row.id);
      if (!variant) {
        variant = { id: row.id, code: row.code, ownerId: row.ownerId, isActive: row.isActive, params: [] };
        byId.set(row.id, variant);
      }
      if (row.paramValueId !== null && row.value !== null) {
        variant.params.push({
          paramValueId: row.paramValueId,
          value: row.value,
          unit: row.unit ?? '',
          unitId: row.unitId ?? 0,
          kind: row.kind,
          kindId: row.kindId,
        });
      }
    }

    return [...byId.values()];
  }

  /**
   * Копия позиции для пользователя вместе со всеми сборками, в чужой транзакции.
   *
   * Сборки копируются с теми же значениями параметров, архивные — тоже архивными:
   * иначе копия отличалась бы от оригинала не только правкой. code у двойников новый —
   * он начинается с id позиции (buildVariantCode), так что с оригиналом не спорит.
   * Нормы расхода в calc-server ссылаются на сборки оригинала — на копию они не переходят.
   */
  async forkOwner(
    kind: 'hand-tool' | 'material',
    source: object,
    changes: Record<string, unknown>,
    user: AuthUser,
    tx: Tx,
  ): Promise<{ owner: Record<string, unknown> & { id: number }; variantIds: Map<number, number> }> {
    const t = this.tables(kind);
    const sourceId = (source as { id: number }).id;

    // Не переименовывал — у копии имя оригинала с пометкой «(копия)»: названия уникальны.
    const names = await forkNames(tx, t.owner as never, t.ownerLabel, source, changes, authorshipFor(user));
    const [owner] = await tx
      .insert(t.owner)
      .values({ ...copyable(source), ...changes, ...names, ...authorshipFor(user), isActive: true })
      .returning();

    const rows = await tx
      .select({ id: t.variantId, isActive: t.variantActive, paramValueId: t.linkParamValueId })
      .from(t.variants)
      .leftJoin(t.links, eq(t.linkVariantId, t.variantId))
      .where(eq(t.variantOwner, sourceId))
      // Тот же порядок, что в listByOwner: id значений в code идут по возрастанию.
      .orderBy(asc(t.variantId), asc(t.linkParamValueId));

    const sets = new Map<number, { isActive: boolean; paramValueIds: number[] }>();
    for (const row of rows) {
      const set = sets.get(row.id) ?? { isActive: row.isActive as boolean, paramValueIds: [] as number[] };
      if (row.paramValueId !== null) set.paramValueIds.push(row.paramValueId);
      sets.set(row.id, set);
    }

    const variantIds = new Map<number, number>();
    for (const [sourceVariantId, set] of sets) {
      const [variant] = await tx
        .insert(t.variants)
        .values({
          code: buildVariantCode(owner.id, set.paramValueIds),
          [t.ownerKey]: owner.id,
          isActive: set.isActive,
        })
        .returning({ id: t.variantId });
      if (set.paramValueIds.length > 0) {
        await tx
          .insert(t.links)
          .values(set.paramValueIds.map((paramValueId) => ({ variantId: variant.id, paramValueId })));
      }
      variantIds.set(sourceVariantId, variant.id);
    }

    return { owner: owner as Record<string, unknown> & { id: number }, variantIds };
  }

  /** Своя позиция (у админа — любая) правится как есть; чужая общая — заводится копия. */
  private async editableOwner(
    tx: Tx,
    kind: 'hand-tool' | 'material',
    ownerId: number,
    user: AuthUser,
  ): Promise<EditableOwner> {
    const owner = await this.visibleOwner(tx, this.tables(kind), ownerId, user);
    if (canModify(owner, user)) return { id: ownerId };

    const fork = await this.forkOwner(kind, owner, {}, user, tx);
    return { id: fork.owner.id, variantIds: fork.variantIds };
  }

  /**
   * id значений для троек «вид, единица, число»: находит в param_values или заводит.
   *
   * Уникальность значений — по той же тройке (NULLS NOT DISTINCT), поэтому
   * «6 мм диаметра» в базе ровно одно, сколько бы инструментов его ни использовали.
   * Число сравниваем как numeric: '6' и '6.0000' в базе — одно и то же.
   */
  private async resolveParams(tx: Tx, params: readonly VariantParamInput[]): Promise<number[]> {
    const ids: number[] = [];

    for (const param of params) {
      const value = String(param.value);
      const match = and(
        param.kindId === null ? isNull(paramValues.kindId) : eq(paramValues.kindId, param.kindId),
        eq(paramValues.value, value),
        eq(paramValues.unitId, param.unitId),
      );

      const [found] = await tx.select({ id: paramValues.id }).from(paramValues).where(match).limit(1);
      if (found) {
        ids.push(found.id);
        continue;
      }

      // onConflictDoNothing: то же значение могли завести параллельно — тогда перечитываем.
      const [created] = await tx
        .insert(paramValues)
        .values({ kindId: param.kindId, value, unitId: param.unitId })
        .onConflictDoNothing()
        .returning({ id: paramValues.id });
      const row =
        created ?? (await tx.select({ id: paramValues.id }).from(paramValues).where(match).limit(1))[0];
      ids.push(row.id);
    }

    return ids;
  }

  /** Все id значений варианта: проверенные готовые плюс найденные/заведённые по тройкам. */
  private async collectParamIds(tx: Tx, source: VariantParamsSource): Promise<number[]> {
    const params = source.params ?? [];
    const kinds = params.map((param) => param.kindId).filter((id) => id !== null);
    // «Диаметр 6 и диаметр 8» в одном типоразмере — почти наверняка опечатка в форме.
    if (new Set(kinds).size !== kinds.length) {
      throw new BadRequestException('Один и тот же вид параметра указан дважды');
    }

    const given = [...(source.paramValueIds ?? [])];
    if (given.length > 0) {
      const known = await tx
        .select({ id: paramValues.id })
        .from(paramValues)
        .where(inArray(paramValues.id, given));

      if (known.length !== new Set(given).size) {
        const missing = given.filter((id) => !known.some((k) => k.id === id));
        throw new BadRequestException(`Значения параметров не найдены: ${missing.join(', ')}`);
      }
    }

    const ids = [...given, ...(await this.resolveParams(tx, params))];
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Один и тот же параметр указан дважды');
    }
    return ids;
  }

  /** code уникален во всей таблице: такой набор параметров у позиции уже есть. */
  private async assertCodeFree(tx: Tx, t: VariantTables, code: string, exceptId?: number) {
    const [existing] = await tx
      .select({ id: t.variantId })
      .from(t.variants)
      .where(
        exceptId === undefined
          ? eq(t.variantCode, code)
          : and(eq(t.variantCode, code), ne(t.variantId, exceptId)),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Такой вариант уже есть: ${code} (id ${existing.id})`);
    }
  }

  /**
   * Без проверки прав: зовётся изнутри — при создании позиции (её автор и так правит)
   * и из createFor(), который права уже проверил. С tx — внутри чужой транзакции.
   */
  async create(
    kind: 'hand-tool' | 'material',
    ownerId: number,
    source: VariantParamsSource,
    tx?: Tx,
  ): Promise<Variant> {
    const t = this.tables(kind);

    const run = async (tx: Tx): Promise<Variant> => {
      // Без этого несуществующий владелец давал 500 с сырой ошибкой FK от Postgres.
      const [owner] = await tx.select({ id: t.ownerId }).from(t.owner).where(eq(t.ownerId, ownerId)).limit(1);
      if (!owner) throw new NotFoundException(`${t.ownerLabel} ${ownerId} не найден`);

      const paramValueIds = await this.collectParamIds(tx, source);
      const code = buildVariantCode(ownerId, paramValueIds);

      // Ту же сборку удаляли (архив держит её code) — возвращаем её, а не 409: заодно
      // остаётся прежний id, на который могут ссылаться нормы расхода.
      const [archived] = await tx
        .select({ id: t.variantId })
        .from(t.variants)
        .where(and(eq(t.variantCode, code), eq(t.variantActive, false)))
        .limit(1);
      if (archived) {
        await tx.update(t.variants).set({ isActive: true }).where(eq(t.variantId, archived.id));
        return { id: archived.id, code, ownerId, isActive: true, params: [] } satisfies Variant;
      }

      await this.assertCodeFree(tx, t, code);

      const [variant] = await tx
        .insert(t.variants)
        .values({ code, [t.ownerKey]: ownerId })
        .returning();

      if (paramValueIds.length > 0) {
        await tx
          .insert(t.links)
          .values(paramValueIds.map((paramValueId) => ({ variantId: variant.id, paramValueId })));
      }

      return { id: variant.id, code, ownerId, isActive: true, params: [] } satisfies Variant;
    };

    return tx ? run(tx) : this.db.transaction(run);
  }

  /** Новая сборка от пользователя: к чужой общей позиции — в его копию, одной транзакцией. */
  createFor(
    kind: 'hand-tool' | 'material',
    ownerId: number,
    source: VariantParamsSource,
    user: AuthUser,
  ): Promise<Variant> {
    return this.db.transaction(async (tx) => {
      const owner = await this.editableOwner(tx, kind, ownerId, user);
      return this.create(kind, owner.id, source, tx);
    });
  }

  /**
   * Заменить параметры типоразмера целиком. id варианта остаётся прежним — на него
   * ссылаются нормы расхода в calc-server, — а code пересчитывается по новому набору.
   * У чужой общей позиции меняется двойник сборки в копии пользователя.
   */
  async replaceParams(
    kind: 'hand-tool' | 'material',
    ownerId: number,
    variantId: number,
    params: readonly VariantParamInput[],
    user: AuthUser,
  ): Promise<Variant> {
    const t = this.tables(kind);

    const target = await this.db.transaction(async (tx) => {
      const [variant] = await tx
        .select({ id: t.variantId })
        .from(t.variants)
        .where(and(eq(t.variantId, variantId), eq(t.variantOwner, ownerId)))
        .limit(1);
      if (!variant) throw new NotFoundException(`Вариант ${variantId} у позиции ${ownerId} не найден`);

      const owner = await this.editableOwner(tx, kind, ownerId, user);
      // Двойник есть всегда: копия берёт все сборки оригинала, и эту — тоже.
      const targetId = owner.variantIds?.get(variantId) ?? variantId;

      const paramValueIds = await this.collectParamIds(tx, { params });
      const code = buildVariantCode(owner.id, paramValueIds);
      await this.assertCodeFree(tx, t, code, targetId);

      await tx.update(t.variants).set({ code }).where(eq(t.variantId, targetId));
      await tx.delete(t.links).where(eq(t.linkVariantId, targetId));
      if (paramValueIds.length > 0) {
        await tx
          .insert(t.links)
          .values(paramValueIds.map((paramValueId) => ({ variantId: targetId, paramValueId })));
      }

      return { ownerId: owner.id, variantId: targetId };
    });

    const variants = await this.listByOwner(kind, target.ownerId, user);
    return variants.find((variant) => variant.id === target.variantId)!;
  }

  /** Удалить сборку можно там же, где позицию: своей — автору, любой — админу. */
  private async assertVariantModifiable(
    kind: 'hand-tool' | 'material',
    variantId: number,
    user: AuthUser | undefined,
  ): Promise<void> {
    const t = this.tables(kind);
    const [variant] = await this.db
      .select({ ownerId: t.variantOwner })
      .from(t.variants)
      .where(eq(t.variantId, variantId))
      .limit(1);
    if (!variant) throw new NotFoundException(`Вариант ${variantId} не найден`);

    const owner = await this.visibleOwner(this.db, t, variant.ownerId, user);
    assertCanModify(owner, user);
  }

  async archive(
    kind: 'hand-tool' | 'material',
    variantId: number,
    user: AuthUser | undefined,
  ): Promise<void> {
    await this.assertVariantModifiable(kind, variantId, user);
    const t = this.tables(kind);
    await this.db.update(t.variants).set({ isActive: false }).where(eq(t.variantId, variantId));
  }

  /**
   * Физическое удаление варианта. Связки параметров уходят каскадом, но нормы
   * расхода в calc-server ссылаются на variant_id из другой базы — проверить
   * их отсюда невозможно, поэтому по умолчанию используется archive().
   */
  async remove(kind: 'hand-tool' | 'material', variantId: number, user: AuthUser | undefined): Promise<void> {
    await this.assertVariantModifiable(kind, variantId, user);
    const t = this.tables(kind);
    await this.db.delete(t.variants).where(eq(t.variantId, variantId));
  }
}

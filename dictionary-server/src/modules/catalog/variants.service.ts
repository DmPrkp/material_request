import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, ne } from 'drizzle-orm';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

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

@Injectable()
export class VariantsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  private tables(kind: 'hand-tool' | 'material'): VariantTables {
    return kind === 'hand-tool' ? HAND_TOOL : MATERIAL;
  }

  async listByOwner(kind: 'hand-tool' | 'material', ownerId: number): Promise<Variant[]> {
    const t = this.tables(kind);

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
      .where(eq(t.variantOwner, ownerId))
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
      const row = created ?? (await tx.select({ id: paramValues.id }).from(paramValues).where(match).limit(1))[0];
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
      .where(exceptId === undefined ? eq(t.variantCode, code) : and(eq(t.variantCode, code), ne(t.variantId, exceptId)))
      .limit(1);

    if (existing) {
      throw new ConflictException(`Такой вариант уже есть: ${code} (id ${existing.id})`);
    }
  }

  /** С tx — внутри чужой транзакции (создание инструмента вместе с вариантами). */
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

  /**
   * Заменить параметры типоразмера целиком. id варианта остаётся прежним — на него
   * ссылаются нормы расхода в calc-server, — а code пересчитывается по новому набору.
   */
  async replaceParams(
    kind: 'hand-tool' | 'material',
    ownerId: number,
    variantId: number,
    params: readonly VariantParamInput[],
  ): Promise<Variant> {
    const t = this.tables(kind);

    await this.db.transaction(async (tx) => {
      const [variant] = await tx
        .select({ id: t.variantId })
        .from(t.variants)
        .where(and(eq(t.variantId, variantId), eq(t.variantOwner, ownerId)))
        .limit(1);
      if (!variant) throw new NotFoundException(`Вариант ${variantId} у позиции ${ownerId} не найден`);

      const paramValueIds = await this.collectParamIds(tx, { params });
      const code = buildVariantCode(ownerId, paramValueIds);
      await this.assertCodeFree(tx, t, code, variantId);

      await tx.update(t.variants).set({ code }).where(eq(t.variantId, variantId));
      await tx.delete(t.links).where(eq(t.linkVariantId, variantId));
      if (paramValueIds.length > 0) {
        await tx.insert(t.links).values(paramValueIds.map((paramValueId) => ({ variantId, paramValueId })));
      }
    });

    const variants = await this.listByOwner(kind, ownerId);
    return variants.find((variant) => variant.id === variantId)!;
  }

  async archive(kind: 'hand-tool' | 'material', variantId: number): Promise<void> {
    const t = this.tables(kind);
    const result = await this.db
      .update(t.variants)
      .set({ isActive: false })
      .where(eq(t.variantId, variantId))
      .returning({ id: t.variantId });

    if (result.length === 0) throw new NotFoundException(`Вариант ${variantId} не найден`);
  }

  /**
   * Физическое удаление варианта. Связки параметров уходят каскадом, но нормы
   * расхода в calc-server ссылаются на variant_id из другой базы — проверить
   * их отсюда невозможно, поэтому по умолчанию используется archive().
   */
  async remove(kind: 'hand-tool' | 'material', variantId: number): Promise<void> {
    const t = this.tables(kind);
    const result = await this.db
      .delete(t.variants)
      .where(eq(t.variantId, variantId))
      .returning({ id: t.variantId });

    if (result.length === 0) throw new NotFoundException(`Вариант ${variantId} не найден`);
  }
}

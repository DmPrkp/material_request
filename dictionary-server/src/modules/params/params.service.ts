import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';

import { CrudService } from '~/common/crud.service';
import { toPage, type Page } from '~/common/pagination';
import { DB, type Database } from '~/db/db.module';
import {
  handToolVariantParams,
  materialVariantParams,
  materials,
  paramKinds,
  paramValues,
  systems,
  units,
} from '~/db/schema';
import type { ParamValueQueryDto } from './params.dto';

@Injectable()
export class UnitsService extends CrudService<typeof units.$inferSelect> {
  constructor(@Inject(DB) db: Database) {
    super(db, units, [units.code, units.nameRu, units.nameEn], units.code, [
      { label: 'paramValues', table: paramValues, column: paramValues.unitId },
      { label: 'materials', table: materials, column: materials.unitId },
      { label: 'systems', table: systems, column: systems.unitId },
    ]);
  }
}

@Injectable()
export class ParamKindsService extends CrudService<typeof paramKinds.$inferSelect> {
  constructor(@Inject(DB) db: Database) {
    super(db, paramKinds, [paramKinds.code, paramKinds.nameRu, paramKinds.nameEn], paramKinds.code, [
      { label: 'paramValues', table: paramValues, column: paramValues.kindId },
    ]);
  }
}

@Injectable()
export class ParamValuesService extends CrudService<typeof paramValues.$inferSelect> {
  constructor(@Inject(DB) db: Database) {
    super(db, paramValues, [], paramValues.id, [
      { label: 'handToolVariantParams', table: handToolVariantParams, column: handToolVariantParams.paramValueId },
      { label: 'materialVariantParams', table: materialVariantParams, column: materialVariantParams.paramValueId },
    ]);
  }

  /** pg отдаёт и принимает numeric строкой — приводим здесь, а не в контроллере. */
  private normalize(data: Record<string, unknown>): Record<string, unknown> {
    const { value } = data;
    if (value === undefined) return data;

    // До сервиса значение доходит уже провалидированным Zod, но типы об этом не знают.
    if (typeof value !== 'number' && typeof value !== 'string') {
      throw new BadRequestException('value должно быть числом');
    }

    return { ...data, value: String(value) };
  }

  override create(data: Record<string, unknown>) {
    return super.create(this.normalize(data));
  }

  /** Значения отдаём вместе с единицей — сами по себе «5.5» бесполезны. */
  async listWithUnit(query: ParamValueQueryDto): Promise<Page<Record<string, unknown>>> {
    const where = and(
      this.stateFilter(query.state),
      query.unitId ? eq(paramValues.unitId, query.unitId) : undefined,
    );

    const [items, [totals]] = await Promise.all([
      this.db
        .select({
          id: paramValues.id,
          value: paramValues.value,
          isActive: paramValues.isActive,
          unit: { id: units.id, code: units.code, nameRu: units.nameRu, nameEn: units.nameEn },
          // Вид необязателен — LEFT JOIN, иначе значения без вида выпадут
          kind: {
            id: paramKinds.id,
            code: paramKinds.code,
            nameRu: paramKinds.nameRu,
            nameEn: paramKinds.nameEn,
          },
        })
        .from(paramValues)
        .innerJoin(units, eq(paramValues.unitId, units.id))
        .leftJoin(paramKinds, eq(paramValues.kindId, paramKinds.id))
        .where(where)
        .orderBy(asc(paramValues.unitId), asc(paramValues.value))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db.select({ value: count() }).from(paramValues).where(where),
    ]);

    return toPage(items, Number(totals?.value ?? 0), query);
  }
}

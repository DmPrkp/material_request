import { ConflictException } from '@nestjs/common';
import { and, eq, ne, or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

import type { Owned } from '~/common/ownership';
import type { Database } from '~/db/db.module';

/**
 * Названия ручного инструмента и материалов уникальны — но не во всей таблице,
 * а среди того, что видит владелец позиции (common/ownership.ts):
 * - общая позиция — среди общих;
 * - личная позиция пользователя — среди общих и его собственных.
 *
 * Во всей таблице нельзя: пользователь Б получал бы «уже есть» из-за личной позиции
 * пользователя А, которой он не видит. Поэтому держит сервис, а не UNIQUE в базе
 * (индекс там — только по автору, от гонок у одного человека). Сравниваем без учёта
 * регистра: «Шпатель» и «шпатель» в сборнике не различить.
 */

export const NAME_KEYS = ['nameRu', 'nameEn'] as const;
export type NameKey = (typeof NAME_KEYS)[number];
export type Names = Partial<Record<NameKey, string | null>>;

type Executor = Pick<Database, 'select'>;
type NamedTable = PgTableWithColumns<any> & {
  id: PgColumn<any>;
  isActive: PgColumn<any>;
  createdBy: PgColumn<any>;
  isShared: PgColumn<any>;
  nameRu: PgColumn<any>;
  nameEn: PgColumn<any>;
};

export class NameTakenException extends ConflictException {
  constructor(label: string, field: NameKey, value: string) {
    super({ error: 'name_taken', field, message: `${label} «${value}» уже есть` });
  }
}

/** Названия из тела запроса или строки; пустые не в счёт — их уникальность не касается. */
export function pickNames(data: object): Names {
  const source = data as Record<string, unknown>;
  const names: Names = {};
  for (const key of NAME_KEYS) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) names[key] = value.trim();
  }
  return names;
}

/** Круг, в котором имя должно быть свободно: что видит владелец позиции. */
function scope(t: NamedTable, owner: Owned): SQL {
  if (owner.isShared) return eq(t.isShared, true);
  return or(eq(t.isShared, true), and(eq(t.isShared, false), eq(t.createdBy, owner.createdBy ?? -1)))!;
}

/** Позиция того же круга с таким же названием; active: false — среди удалённых. */
export async function findNamesake(
  db: Executor,
  t: NamedTable,
  owner: Owned,
  names: Names,
  options: { active: boolean; exceptId?: number },
): Promise<{ id: number; field: NameKey } | undefined> {
  for (const field of NAME_KEYS) {
    const value = names[field];
    if (!value) continue;

    const [row] = await db
      .select({ id: t.id })
      .from(t)
      .where(
        and(
          sql`lower(${t[field]}) = lower(${value})`,
          eq(t.isActive, options.active),
          scope(t, owner),
          options.exceptId === undefined ? undefined : ne(t.id, options.exceptId),
        ),
      )
      .limit(1);
    if (row) return { id: row.id as number, field };
  }
  return undefined;
}

export async function assertNamesFree(
  db: Executor,
  t: NamedTable,
  label: string,
  owner: Owned,
  names: Names,
  exceptId?: number,
): Promise<void> {
  const namesake = await findNamesake(db, t, owner, names, { active: true, exceptId });
  if (namesake) throw new NameTakenException(label, namesake.field, names[namesake.field]!);
}

const COPY_MARK: Record<NameKey, string> = { nameRu: 'копия', nameEn: 'copy' };

/** «шпатель (копия)», «шпатель (копия 2)»… — с обрезкой основы под длину колонки. */
export function copyCandidate(base: string, field: NameKey, attempt: number, maxLength: number): string {
  const mark = ` (${COPY_MARK[field]}${attempt > 1 ? ` ${attempt}` : ''})`;
  return base.slice(0, Math.max(0, maxLength - mark.length)).trimEnd() + mark;
}

/**
 * Названия копии чужой позиции (CrudService.fork).
 *
 * Пользователь переименовал — новое имя обязано быть свободным, иначе 409: «шпатель888»
 * обратно в «шпатель» при живом общем «шпателе» — отказ. Не переименовывал (правил
 * сборку, единицу, описание) — имя совпадёт с оригиналом, и копия получает пометку.
 */
export async function forkNames(
  db: Executor,
  t: NamedTable,
  label: string,
  source: object,
  changes: Record<string, unknown>,
  owner: Owned,
): Promise<Names> {
  const before = source as Record<string, unknown>;
  const names: Names = {};

  for (const field of NAME_KEYS) {
    const original = typeof before[field] === 'string' ? before[field] : null;
    const next = field in changes ? (changes[field] as string | null) : original;
    names[field] = next;
    if (!next) continue;

    const namesake = await findNamesake(db, t, owner, { [field]: next }, { active: true });
    if (!namesake) continue;

    const renamed = original === null || original.toLowerCase() !== next.toLowerCase();
    if (renamed) throw new NameTakenException(label, field, next);

    const maxLength = (t[field] as { length?: number }).length ?? 100;
    for (let attempt = 1; ; attempt++) {
      const candidate = copyCandidate(next, field, attempt, maxLength);
      if (!(await findNamesake(db, t, owner, { [field]: candidate }, { active: true }))) {
        names[field] = candidate;
        break;
      }
    }
  }

  return names;
}

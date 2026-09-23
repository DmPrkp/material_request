import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { type QueryResult, types } from 'pg';

import { DbPools } from '~/db/pools';

import { type RefKind, refKindFor, refSource } from './refs';
import { TABLES, type TableDef } from './registry';

/** Больше в браузер не везём: AG Grid держит всё в памяти. Упрёмся — серверная пагинация. */
export const ROW_LIMIT = 5000;

export type ColumnType = 'number' | 'boolean' | 'date' | 'json' | 'array' | 'text';
export type Column = { field: string; type: ColumnType; ref?: boolean };

/** Подписи ссылок строки: колонка → строка или null, если ссылка висячая. */
export const LABELS = '$labels';

const { builtins } = types;
const NUMERIC_OIDS = new Set<number>([
  builtins.INT2,
  builtins.INT4,
  builtins.INT8,
  builtins.NUMERIC,
  builtins.FLOAT4,
  builtins.FLOAT8,
]);
const DATE_OIDS = new Set<number>([builtins.DATE, builtins.TIMESTAMP, builtins.TIMESTAMPTZ]);
const JSON_OIDS = new Set<number>([builtins.JSON, builtins.JSONB]);
// int[] и text[]: pg разбирает их в массив сам; enum-массивы реестр приводит к text[].
const ARRAY_OIDS = new Set<number>([1005, 1007, 1016, 1009, 1015]);

function columnType(oid: number): ColumnType {
  if (NUMERIC_OIDS.has(oid)) return 'number';
  if (oid === Number(builtins.BOOL)) return 'boolean';
  if (DATE_OIDS.has(oid)) return 'date';
  if (JSON_OIDS.has(oid)) return 'json';
  if (ARRAY_OIDS.has(oid)) return 'array';
  return 'text';
}

@Injectable()
export class TablesService {
  constructor(private readonly db: DbPools) {}

  list() {
    return TABLES.map(({ key, db, group, title, from, create }) => ({ key, db, group, title, from, create }));
  }

  async rows(key: string) {
    const def = TABLES.find((table) => table.key === key);
    if (!def) throw new NotFoundException(`Нет таблицы ${key}`);

    let result: QueryResult;
    try {
      // Всё в SQL — из реестра в коде, пользовательского ввода здесь нет.
      result = await this.db.query(
        def.db,
        `SELECT ${def.select ?? '*'} FROM ${def.from} ORDER BY ${def.orderBy ?? '1'} LIMIT ${ROW_LIMIT + 1}`,
      );
      await this.attachLabels(def, result.rows);
    } catch (error) {
      // Текст ошибки Postgres — именно то, что разработчику нужно увидеть: нет прав у
      // read-only роли, таблицу переименовали в миграции, колонки из реестра больше нет.
      throw new InternalServerErrorException(`${def.db}: ${(error as Error).message}`);
    }
    const truncated = result.rows.length > ROW_LIMIT;
    const rows = truncated ? result.rows.slice(0, ROW_LIMIT) : result.rows;

    const columns: Column[] = result.fields.map((field) => ({
      field: field.name,
      type: columnType(field.dataTypeID),
      ...(def.refs?.[field.name] ? { ref: true } : {}),
    }));

    return {
      key: def.key,
      title: def.title,
      db: def.db,
      from: def.from,
      create: def.create,
      columns,
      rows,
      truncated,
      limit: ROW_LIMIT,
    };
  }

  /**
   * Одним запросом на вид ссылки, а не на строку: собираем ключи со всей выборки, идём в
   * нужную базу и раскладываем подписи обратно по строкам. Базы разные, JOIN-а нет.
   */
  private async attachLabels(def: TableDef, rows: Record<string, unknown>[]): Promise<void> {
    if (!def.refs || !rows.length) return;
    const refs = Object.entries(def.refs);

    const wanted = new Map<RefKind, Set<string>>();
    for (const row of rows) {
      for (const [column, spec] of refs) {
        const value = row[column];
        const kind = refKindFor(spec, row);
        if (value == null || !kind) continue;
        if (!wanted.has(kind)) wanted.set(kind, new Set());
        wanted.get(kind)!.add(`${value as string | number}`);
      }
    }

    const resolved = new Map<RefKind, Map<string, string>>();
    await Promise.all(
      [...wanted].map(async ([kind, keys]) => {
        const source = refSource(kind);
        const list = source.int ? [...keys].filter((k) => /^\d+$/.test(k)) : [...keys];
        const labels = new Map<string, string>();
        if (list.length) {
          const { rows: found } = await this.db.query<{ key: string; label: string }>(source.db, source.sql, [
            list,
          ]);
          for (const { key, label } of found) labels.set(key, label);
        }
        resolved.set(kind, labels);
      }),
    );

    for (const row of rows) {
      const labels: Record<string, string | null> = {};
      for (const [column, spec] of refs) {
        const value = row[column];
        const kind = refKindFor(spec, row);
        if (value == null || !kind) continue;
        labels[column] = resolved.get(kind)?.get(`${value as string | number}`) ?? null;
      }
      row[LABELS] = labels;
    }
  }
}

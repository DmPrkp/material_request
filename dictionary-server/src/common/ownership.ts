import { ForbiddenException } from '@nestjs/common';
import { eq, or, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import type { AuthUser } from '~/auth/jwt-payload';

/**
 * Кто что видит и правит в справочниках с автором (authorship в schema.ts).
 *
 * Правило одно на все разделы:
 * - общее (is_shared) — сиды и всё, что завёл админ: видят все, правит и удаляет только админ;
 * - своё — заведённое пользователем: видят он и админ, правят и удаляют тоже они;
 * - правка чужого общего пользователем не трогает оригинал, а заводит ему копию
 *   (CrudService.fork) — дальше он правит уже её, а оригинал видит рядом.
 *
 * Флаг, а не «created_by — админ»: кто админ, знает только user-server, в его базу
 * словарь не ходит. Роль берётся из токена в момент создания и остаётся на строке.
 */
export type Owned = { createdBy: number | null; isShared: boolean };
export type OwnedColumns = { createdBy: PgColumn<any>; isShared: PgColumn<any> };

export function isAdmin(user: AuthUser | undefined): boolean {
  return user?.role === 'ADMIN';
}

/** Фильтр списка: админу — всё, вошедшему — общее и своё, анониму — только общее. */
export function visibleTo(t: OwnedColumns, user: AuthUser | undefined): SQL | undefined {
  if (isAdmin(user)) return undefined;
  if (!user) return eq(t.isShared, true);
  return or(eq(t.isShared, true), eq(t.createdBy, user.id));
}

export function canSee(row: Owned, user: AuthUser | undefined): boolean {
  return isAdmin(user) || row.isShared || (user !== undefined && row.createdBy === user.id);
}

/** Править на месте, удалять и восстанавливать: админ — всё, остальные — своё. */
export function canModify(row: Owned, user: AuthUser | undefined): boolean {
  return isAdmin(user) || (user !== undefined && row.createdBy === user.id);
}

export function assertCanModify(row: Owned, user: AuthUser | undefined): void {
  if (!canModify(row, user)) {
    throw new ForbiddenException('Удалять и восстанавливать можно только своё — чужое может только админ');
  }
}

/** Строка без служебных колонок — из неё копия (fork) заводит свою, с новым id и датами. */
export function copyable(row: object): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...row };
  for (const key of ['id', 'createdAt', 'updatedAt']) delete rest[key];
  return rest;
}

/** Новая строка: у админа сразу общая, у остальных — видна только им самим и админу. */
export function authorshipFor(user: AuthUser): Owned {
  return { createdBy: user.id, isShared: isAdmin(user) };
}

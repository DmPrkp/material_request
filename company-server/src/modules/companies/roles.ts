import type { AuthUser } from '~/auth/auth-user';
import { COMPANY_ROLES, type CompanyRole } from '~/db/schema';

/**
 * Права внутри компании — от ролей участника, админ приложения (role ADMIN в токене)
 * может всё, что владелец. Не участник компании её не видит вовсе (404, а не 403).
 *
 * | действие                          | own | manage | review / store |
 * | --------------------------------- | --- | ------ | -------------- |
 * | видеть компанию и участников      | да  | да     | да             |
 * | переименовать                     | да  | да     | —              |
 * | удалить                           | да  | —      | —              |
 * | выдать/снять review, store        | да  | да     | —              |
 * | выдать/снять own, manage          | да  | —      | —              |
 * | выйти самому                      | да  | да     | да             |
 *
 * own и manage раздаёт только владелец: иначе управляющий назначил бы себе
 * напарника-управляющего, а тот — владельца, и владение ушло бы без ведома владельца.
 * Последнего владельца не снять и не удалить (сервис отвечает 409): у компании
 * всегда есть кто-то, кто может её удалить и раздать роли.
 */
export type Actor = {
  user: AuthUser;
  /** Роли в этой компании; [] — не участник. */
  roles: readonly CompanyRole[];
};

const OWNER_ONLY: readonly CompanyRole[] = ['own', 'manage'];

function isAdmin(actor: Actor): boolean {
  return actor.user.role === 'ADMIN';
}

function has(actor: Actor, role: CompanyRole): boolean {
  return actor.roles.includes(role);
}

export function canView(actor: Actor): boolean {
  return isAdmin(actor) || actor.roles.length > 0;
}

export function canEditCompany(actor: Actor): boolean {
  return isAdmin(actor) || has(actor, 'own') || has(actor, 'manage');
}

export function canDeleteCompany(actor: Actor): boolean {
  return isAdmin(actor) || has(actor, 'own');
}

/** Какие роли actor вправе выдавать и снимать другим. */
export function grantableRoles(actor: Actor): readonly CompanyRole[] {
  if (isAdmin(actor) || has(actor, 'own')) return COMPANY_ROLES;
  if (has(actor, 'manage')) return COMPANY_ROLES.filter((role) => !OWNER_ONLY.includes(role));
  return [];
}

/**
 * Можно ли перевести участника из before в after. [] в before — новый участник,
 * [] в after — удаление. Проверяется только то, что меняется: управляющий может
 * поправить хранение у владельца, не трогая его own.
 *
 * Выйти из компании (after пуст, участник — сам actor) можно всегда; что после
 * выхода остался владелец, проверяет сервис — это вопрос состава, а не прав.
 */
export function canChangeMember(
  actor: Actor,
  targetUserId: number,
  before: readonly CompanyRole[],
  after: readonly CompanyRole[],
): boolean {
  if (after.length === 0 && targetUserId === actor.user.id && before.length > 0) return true;

  const changed = [
    ...before.filter((role) => !after.includes(role)),
    ...after.filter((role) => !before.includes(role)),
  ];
  const grantable = grantableRoles(actor);
  return changed.every((role) => grantable.includes(role));
}

/** Без повторов и в порядке COMPANY_ROLES — чтобы ответы и сравнения были стабильны. */
export function normalizeRoles(roles: readonly CompanyRole[]): CompanyRole[] {
  return COMPANY_ROLES.filter((role) => roles.includes(role));
}

import type { AuthUser } from '~/auth/auth-user';

/**
 * Кто что может со складом. Админ приложения (ADMIN в токене) — всё.
 *
 * «Управляющий» склада — его создатель (owner_id) и own/manage компании склада.
 *
 * | действие                               | управляющий | назначенный | остальные |
 * | -------------------------------------- | ----------- | ----------- | --------- |
 * | видеть склад и назначенных             | да          | да          | 404       |
 * | править, архивировать, удалять         | да          | 403         | 404       |
 * | назначать и снимать пользователей      | см. ниже    | 403         | 404       |
 * | снять себя                             | —           | да          | 404       |
 *
 * Назначать — только own/manage компании склада (и админ): склад без компании личный,
 * назначать на него некого. Создатель склада, не управляющий в компании, этого права
 * не имеет. Назначенный обязан быть участником той же компании — проверяет сервис.
 *
 * Чужой склад — 404, а не 403: незачем подтверждать, что такой есть. Назначенному
 * склад уже виден, поэтому ему на правку — честный 403.
 */
export type WarehouseActor = {
  user: AuthUser;
  isOwner: boolean;
  /** Назначен на склад (warehouse_users). */
  isAssigned: boolean;
  /** Роли в компании склада; [] — склад без компании или не участник. */
  companyRoles: readonly string[];
};

function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN';
}

/** own или manage в компании — по её ролям из company-server. */
export function managesCompany(user: AuthUser, companyRoles: readonly string[]): boolean {
  return isAdmin(user) || companyRoles.includes('own') || companyRoles.includes('manage');
}

export function canManage(actor: WarehouseActor): boolean {
  return actor.isOwner || managesCompany(actor.user, actor.companyRoles);
}

export function canView(actor: WarehouseActor): boolean {
  return canManage(actor) || actor.isAssigned;
}

export function canAssign(actor: WarehouseActor): boolean {
  return managesCompany(actor.user, actor.companyRoles);
}

/** Снять с назначения: кто назначает — любого, назначенный — только себя. */
export function canUnassign(actor: WarehouseActor, userId: number): boolean {
  return canAssign(actor) || (actor.isAssigned && actor.user.id === userId);
}

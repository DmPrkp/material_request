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
 *
 * «На руках» (holding) — склад-человек компании, права у него свои:
 *
 * | действие                               | own/manage | держатель | выдавший впервые | остальные |
 * | -------------------------------------- | ---------- | --------- | ---------------- | --------- |
 * | видеть и что лежит                     | да         | да        | 404              | 404       |
 * | вести содержимое (вернуть, списать)    | да         | 403       | 404              | 404       |
 * | удалить                                | да         | 403       | 404              | 404       |
 *
 * owner_id у «рук» — случайность (кто выдал первым), прав он не даёт: иначе кладовщик,
 * однажды выдавший, навсегда видел бы чужие руки. Держатель своё только видит — списать
 * выданное сам он не может, это вынос мимо учёта. Переименовать, архивировать, назначить
 * на «руки» нельзя никому (409 в сервисе): им не нужно ни имя, ни назначенные.
 */
export type WarehouseActor = {
  user: AuthUser;
  isOwner: boolean;
  /** Назначен на склад (warehouse_users). */
  isAssigned: boolean;
  /** Роли в компании склада; [] — склад без компании или не участник. */
  companyRoles: readonly string[];
  /** Склад — «на руках» (holder_user_id задан). */
  holding: boolean;
  /** Спрашивающий — держатель этих «рук». */
  isHolder: boolean;
};

function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN';
}

/** own или manage в компании — по её ролям из company-server. */
export function managesCompany(user: AuthUser, companyRoles: readonly string[]): boolean {
  return isAdmin(user) || companyRoles.includes('own') || companyRoles.includes('manage');
}

export function canManage(actor: WarehouseActor): boolean {
  if (actor.holding) return managesCompany(actor.user, actor.companyRoles);
  return actor.isOwner || managesCompany(actor.user, actor.companyRoles);
}

export function canView(actor: WarehouseActor): boolean {
  return canManage(actor) || (actor.holding ? actor.isHolder : actor.isAssigned);
}

/** Вести содержимое: обычного склада — всем, кому он виден, «рук» — только управляющим. */
export function canEditItems(actor: WarehouseActor): boolean {
  return actor.holding ? canManage(actor) : canView(actor);
}

export function canAssign(actor: WarehouseActor): boolean {
  return managesCompany(actor.user, actor.companyRoles);
}

/** Снять с назначения: кто назначает — любого, назначенный — только себя. */
export function canUnassign(actor: WarehouseActor, userId: number): boolean {
  return canAssign(actor) || (actor.isAssigned && actor.user.id === userId);
}

/**
 * Куда можно переложить содержимое склада: на другой действующий склад той же компании,
 * а с личного — на другой личный. Склад компании — её имущество, и увезти его на
 * личный (или в чужую компанию) значило бы вынести со склада мимо учёта. Видеть оба
 * склада спрашивающий обязан отдельно — это проверяет сервис.
 *
 * С «рук» — можно (это возврат), на «руки» — нет: туда только выдачей (canIssueFrom),
 * она проверяет, что получатель — участник компании.
 */
export function canMoveItems(
  from: { id: number; companyId: number | null },
  to: { id: number; companyId: number | null; holderUserId: number | null; isActive: boolean },
): boolean {
  return from.id !== to.id && to.isActive && to.holderUserId === null && from.companyId === to.companyId;
}

/**
 * Выдают со склада компании: с личного — некому (свои вещи и так свои), с «рук» — только
 * через возврат, иначе выданное гуляло бы между людьми мимо склада.
 */
export function canIssueFrom(from: { companyId: number | null; holderUserId: number | null }): boolean {
  return from.companyId !== null && from.holderUserId === null;
}

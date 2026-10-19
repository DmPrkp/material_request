import type { Request } from 'express';

/**
 * Кто прислал запрос. Токен user-server проверяет nginx (nginx/njs/auth.js) и передаёт
 * итог заголовками X-User-Id / X-User-Role — сервис секрета не знает и заголовкам верит.
 *
 * Верить можно, потому что на проде порт сервиса наружу не опубликован (compose.prod.yaml),
 * а присланные клиентом X-User-* nginx затирает. В dev порты открыты ради отладки — там
 * заголовок подделает кто угодно, и это осознанно.
 *
 * Логина в заголовках нет: сервисам хватает id и роли. Понадобится — добавить в auth.js.
 * Роль — из токена, в базу пользователей никто, кроме user-server, не ходит: удалённый
 * пользователь сохранит доступ, пока не истечёт токен (JWT_EXPIRES_IN).
 */
export type AuthUser = {
  id: number;
  role: 'USER' | 'ADMIN';
};

export type AuthenticatedRequest = Request & { user?: AuthUser };

/** Заголовков нет или они кривые — аноним: кривые мог прислать только не nginx. */
export function userFromHeaders(request: Request): AuthUser | undefined {
  const id = Number(request.headers['x-user-id']);
  const role = request.headers['x-user-role'];
  if (!Number.isInteger(id) || id <= 0) return undefined;
  if (role !== 'USER' && role !== 'ADMIN') return undefined;
  return { id, role };
}

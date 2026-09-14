import type { Request } from 'express';

/**
 * То, что кладёт в токен user-server (user-server/src/auth/jwt-payload.ts).
 *
 * Общего пакета между сервисами нет: каждый собирается из своего docker-контекста
 * и до соседних каталогов не дотягивается. Поэтому контракт продублирован —
 * поменяли его в user-server, поменяйте и здесь.
 */
export type JwtPayload = {
  sub: number;
  login: string;
  role: 'USER' | 'ADMIN';
};

/** Кто прислал запрос — только то, что есть в токене: в базу пользователей словарь не ходит. */
export type AuthUser = {
  id: number;
  login: string;
  role: JwtPayload['role'];
};

export type AuthenticatedRequest = Request & { user?: AuthUser };

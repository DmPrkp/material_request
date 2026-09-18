import type { Request } from 'express';

/**
 * То, что кладёт в токен user-server (user-server/src/auth/jwt-payload.ts).
 * Общего пакета между сервисами нет — контракт продублирован, как в calc-server и dictionary-server.
 */
export type JwtPayload = {
  sub: number;
  login: string;
  role: 'USER' | 'ADMIN';
};

export type AuthUser = {
  id: number;
  login: string;
  role: JwtPayload['role'];
};

export type AuthenticatedRequest = Request & { user?: AuthUser };

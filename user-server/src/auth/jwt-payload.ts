import type { Role } from '~/db/schema';

// login и role в токене — для других сервисов, которым незачем ходить в базу пользователей.
// Сам user-server роли из токена не верит и перечитывает пользователя (см. AuthGuard).
export interface JwtPayload {
  sub: number;
  login: string;
  role: Role;
}

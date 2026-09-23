import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { type AdminUser, UserServerClient } from './user-server.client';

const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export type AdminRequest = Request & { user?: AdminUser };

// Таблица грузится несколькими запросами подряд — не дёргаем user-server на каждый.
// Короткий срок: снятая роль ADMIN должна отрезать доступ почти сразу.
const CACHE_MS = 30_000;

/**
 * Пускает только ADMIN. Порт админки опубликован мимо nginx (закрыт снаружи роутером),
 * поэтому X-User-* здесь нет — токен проверяется вопросом к user-server.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly cache = new Map<string, { user: AdminUser; until: number }>();

  constructor(
    private readonly users: UserServerClient,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    request.user = await this.resolve(token);
    if (request.user.role !== 'ADMIN') throw new ForbiddenException('Нужна роль ADMIN');
    return true;
  }

  private async resolve(token: string): Promise<AdminUser> {
    const now = Date.now();
    const cached = this.cache.get(token);
    if (cached && cached.until > now) return cached.user;

    const user = await this.users.me(token);
    for (const [key, entry] of this.cache) if (entry.until <= now) this.cache.delete(key);
    this.cache.set(token, { user, until: now + CACHE_MS });
    return user;
  }
}

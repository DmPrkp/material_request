import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { type AuthenticatedRequest, userFromHeaders } from './auth-user';

/**
 * Глобальный: узнаёт вошедшего и на чтении, чтобы список отдал ему его собственные
 * позиции (common/ownership.ts). Без заголовков — аноним: справочник читают и без входа.
 *
 * Битый токен сюда не доходит — nginx отвечает на него 401 сам (nginx/njs/auth.js).
 */
@Injectable()
export class IdentifyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = userFromHeaders(request);
    return true;
  }
}

/** Пускает только вошедшего — для записи в authored-справочники. */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Глобальный IdentifyGuard обычно уже прочёл заголовки — читаем сами, если нет.
    request.user ??= userFromHeaders(request);
    if (!request.user) throw new UnauthorizedException();
    return true;
  }
}

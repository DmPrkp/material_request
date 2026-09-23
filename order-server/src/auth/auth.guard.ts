import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { type AuthenticatedRequest, userFromHeaders } from './auth-user';

/** Только со входом: список своих, перенос анонимных заявок себе. */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user ??= userFromHeaders(request);
    if (!request.user) throw new UnauthorizedException();
    return true;
  }
}

/**
 * Заявку можно завести и без входа — тогда request.user пуст. Битый токен сюда не
 * доходит: nginx отвечает на него 401 сам, и вошедший с протухшим токеном не заведёт
 * молча ничью заявку.
 */
@Injectable()
export class IdentifyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = userFromHeaders(request);
    return true;
  }
}

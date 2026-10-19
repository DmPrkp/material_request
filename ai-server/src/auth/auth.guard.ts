import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { type AuthenticatedRequest, userFromHeaders } from './auth-user';

/**
 * Ассистент действует от имени пользователя, а аноним — это никто: действовать не от кого,
 * поэтому вход обязателен целиком, без @Public-ручек.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user ??= userFromHeaders(request);
    if (!request.user) throw new UnauthorizedException();
    return true;
  }
}

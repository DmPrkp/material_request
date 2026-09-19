import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { type AuthenticatedRequest, userFromHeaders } from './auth-user';

/**
 * Пускает только вошедшего и кладёт его в request.user. Кто он — сказал nginx
 * заголовками (auth-user.ts), токен здесь не проверяется.
 *
 * В отличие от словаря, анонимного чтения тут нет: склад — личное, общего в нём ничего,
 * поэтому гвард висит на всём приложении (APP_GUARD), а не на отдельных методах.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = userFromHeaders(request);
    if (!request.user) throw new UnauthorizedException();
    return true;
  }
}

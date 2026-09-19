import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest, AuthUser } from './auth-user';

/**
 * Пользователь из заголовков nginx. AuthGuard висит глобально, так что в любом обработчике
 * он есть — тип без undefined, чтобы сервисы не проверяли то, что уже проверил гвард.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user as AuthUser,
);

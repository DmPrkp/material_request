import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth-user';

/** Пользователь из заголовков nginx (auth-user.ts); у анонима — undefined, за AuthGuard есть всегда. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

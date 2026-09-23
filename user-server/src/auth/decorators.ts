import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '~/db/schema';
import type { Request } from 'express';
import { PublicUser } from '../users/public-user';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

export type AuthenticatedRequest = Request & { user?: PublicUser };

// AuthGuard висит глобально, так что закрыто всё, что явно не открыто:
// новый эндпоинт без @Public() не окажется случайно доступен анониму.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

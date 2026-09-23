import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '~/db/schema';
import { toPublicUser } from '../users/public-user';
import { UsersService } from '../users/users.service';
import { AuthenticatedRequest, IS_PUBLIC_KEY, ROLES_KEY } from './decorators';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    // Пользователя читаем из базы, а не верим токену: пока токен жив, роль могли
    // снять, а самого пользователя — удалить.
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    request.user = toPublicUser(user);

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles?.length && !roles.includes(user.role)) {
      throw new ForbiddenException();
    }

    return true;
  }
}

function extractBearerToken(request: AuthenticatedRequest): string | undefined {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { AuthenticatedRequest, AuthUser, JwtPayload } from './jwt-payload';

/**
 * Токен проверяется здесь же общим JWT_SECRET, а не заголовком от nginx: порт 4100
 * проброшен наружу мимо nginx, заголовок подделал бы кто угодно. Правило то же,
 * что в calc-server и dictionary-server.
 */
async function readUser(jwt: JwtService, request: AuthenticatedRequest): Promise<AuthUser | undefined> {
  const token = extractBearerToken(request);
  if (!token) return undefined;

  // Без секрета любая подпись «не наша» — чинить надо конфиг, а не вход.
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ServiceUnavailableException('JWT_SECRET не задан — вход в заявках недоступен');

  let payload: JwtPayload;
  try {
    // Алгоритм закреплён: user-server подписывает HS256, alg: none и прочее не принимаем.
    payload = await jwt.verifyAsync<JwtPayload>(token, { secret, algorithms: ['HS256'] });
  } catch {
    throw new UnauthorizedException();
  }

  if (!Number.isInteger(payload.sub)) throw new UnauthorizedException();
  return { id: payload.sub, login: payload.login, role: payload.role };
}

/** Только со входом: список своих, перенос анонимных заявок себе. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await readUser(this.jwt, request);
    if (!user) throw new UnauthorizedException();
    request.user = user;
    return true;
  }
}

/**
 * Заявку можно завести и без входа — тогда request.user пуст. Но битый токен — 401,
 * а не аноним: иначе вошедший с протухшим токеном молча заводил бы ничьи заявки.
 */
@Injectable()
export class IdentifyGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await readUser(this.jwt, request);
    return true;
  }
}

export function extractBearerToken(request: AuthenticatedRequest): string | undefined {
  const [scheme, token] = (request.headers.authorization ?? '').split(' ');
  return scheme === 'Bearer' && token ? token : undefined;
}

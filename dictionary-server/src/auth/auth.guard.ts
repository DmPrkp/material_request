import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { AuthenticatedRequest, JwtPayload } from './jwt-payload';

/**
 * Пускает только с валидным токеном user-server и кладёт пользователя в request.user.
 *
 * Токен проверяется здесь же, общим JWT_SECRET, а не заголовком от nginx: порт 4300
 * проброшен наружу мимо nginx, и заголовок «кто я» подделал бы любой, кто стучится
 * напрямую. Подпись так не подделать.
 *
 * Роль и существование пользователя берутся из токена, в базу пользователей словарь
 * не ходит: удалённый пользователь сможет писать, пока не истечёт токен (JWT_EXPIRES_IN).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly secret: string | undefined;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.get<string>('JWT_SECRET') || undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Без секрета проверить подпись нечем. Случайный, как в user-server, тут не годится:
    // он ни с чьим не совпадёт, и 401 на каждый запрос выглядел бы как протухший вход.
    if (!this.secret) {
      throw new ServiceUnavailableException('JWT_SECRET не задан: запись в справочник закрыта');
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) throw new UnauthorizedException();

    let payload: JwtPayload;
    try {
      // Алгоритм закреплён: user-server подписывает HS256, и ничего другого принимать незачем.
      payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret: this.secret, algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException();
    }

    if (!Number.isInteger(payload.sub)) throw new UnauthorizedException();

    request.user = { id: payload.sub, login: payload.login, role: payload.role };
    return true;
  }
}

function extractBearerToken(request: AuthenticatedRequest): string | undefined {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

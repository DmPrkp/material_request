import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { AuthenticatedRequest, AuthUser, JwtPayload } from './jwt-payload';

/**
 * Проверка токена user-server — общая для обоих гвардов.
 *
 * Токен проверяется здесь же, общим JWT_SECRET, а не заголовком от nginx: порт 4300
 * проброшен наружу мимо nginx, и заголовок «кто я» подделал бы любой, кто стучится
 * напрямую. Подпись так не подделать.
 *
 * Роль и существование пользователя берутся из токена, в базу пользователей словарь
 * не ходит: удалённый пользователь сможет писать, пока не истечёт токен (JWT_EXPIRES_IN).
 */
@Injectable()
class TokenReader {
  protected readonly secret: string | undefined;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.get<string>('JWT_SECRET') || undefined;
  }

  /** Нет заголовка — undefined; заголовок есть, но токен не наш или протух — 401. */
  protected async read(request: AuthenticatedRequest): Promise<AuthUser | undefined> {
    const token = extractBearerToken(request);
    if (!token || !this.secret) return undefined;

    let payload: JwtPayload;
    try {
      // Алгоритм закреплён: user-server подписывает HS256, и ничего другого принимать незачем.
      payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret: this.secret, algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException();
    }

    if (!Number.isInteger(payload.sub)) throw new UnauthorizedException();
    return { id: payload.sub, login: payload.login, role: payload.role };
  }
}

/**
 * Глобальный: узнаёт вошедшего и на чтении, чтобы список отдал ему его собственные
 * позиции (common/ownership.ts). Без токена пропускает анонимом — справочник читают
 * и без входа. Битый токен — 401, а не аноним: иначе вошедший молча терял бы своё,
 * а клиент не узнал бы, что пора выйти (BaseModel.onUnauthorized).
 *
 * Без JWT_SECRET проверять нечем — тоже аноним: чтение от конфига не зависит,
 * а запись остановит JwtAuthGuard своим 503.
 */
@Injectable()
export class IdentifyGuard extends TokenReader implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.read(request);
    if (user) request.user = user;
    return true;
  }
}

/** Пускает только с валидным токеном user-server и кладёт пользователя в request.user. */
@Injectable()
export class JwtAuthGuard extends TokenReader implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Без секрета проверить подпись нечем. Случайный, как в user-server, тут не годится:
    // он ни с чьим не совпадёт, и 401 на каждый запрос выглядел бы как протухший вход.
    if (!this.secret) {
      throw new ServiceUnavailableException('JWT_SECRET не задан: запись в справочник закрыта');
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Глобальный IdentifyGuard уже прочёл токен — второй раз подпись не проверяем.
    const user = request.user ?? (await this.read(request));
    if (!user) throw new UnauthorizedException();

    request.user = user;
    return true;
  }
}

function extractBearerToken(request: AuthenticatedRequest): string | undefined {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

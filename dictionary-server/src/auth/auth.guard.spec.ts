import { type ExecutionContext, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';

import { JwtAuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './jwt-payload';

const SECRET = 'test-secret';
const jwt = new JwtService();

function guardWith(secret: string | undefined): JwtAuthGuard {
  return new JwtAuthGuard(jwt, { get: () => secret } as unknown as ConfigService);
}

function contextFor(authorization?: string): { context: ExecutionContext; request: AuthenticatedRequest } {
  const request = { headers: authorization ? { authorization } : {} } as AuthenticatedRequest;
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  return { context, request };
}

const payload = { sub: 7, login: 'ivan', role: 'USER' as const };

describe('JwtAuthGuard', () => {
  it('пускает с токеном user-server и кладёт пользователя в request', async () => {
    const { context, request } = contextFor(`Bearer ${jwt.sign(payload, { secret: SECRET })}`);

    await expect(guardWith(SECRET).canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 7, login: 'ivan', role: 'USER' });
  });

  it('без заголовка — 401', async () => {
    await expect(guardWith(SECRET).canActivate(contextFor().context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('токен, подписанный чужим секретом, — 401', async () => {
    const { context } = contextFor(`Bearer ${jwt.sign(payload, { secret: 'other' })}`);
    await expect(guardWith(SECRET).canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('протухший токен — 401', async () => {
    const expired = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 60 }, { secret: SECRET });
    await expect(guardWith(SECRET).canActivate(contextFor(`Bearer ${expired}`).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('неподписанный токен (alg: none) — 401', async () => {
    const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
    await expect(guardWith(SECRET).canActivate(contextFor(`Bearer ${unsigned}`).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('токен без числового sub — 401', async () => {
    const { context } = contextFor(`Bearer ${jwt.sign({ login: 'ivan', role: 'USER' }, { secret: SECRET })}`);
    await expect(guardWith(SECRET).canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('без JWT_SECRET — 503, а не 401: чинить надо конфиг, а не вход', async () => {
    const { context } = contextFor(`Bearer ${jwt.sign(payload, { secret: SECRET })}`);
    await expect(guardWith(undefined).canActivate(context)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

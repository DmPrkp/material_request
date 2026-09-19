import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuthGuard, IdentifyGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth-user';

function contextFor(headers: Record<string, string> = {}): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
} {
  const request = { headers } as unknown as AuthenticatedRequest;
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  return { context, request };
}

const fromNginx = { 'x-user-id': '7', 'x-user-role': 'USER' };

describe('IdentifyGuard', () => {
  it('без заголовков пускает анонимом — справочник читают и без входа', () => {
    const { context, request } = contextFor();
    expect(new IdentifyGuard().canActivate(context)).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('с заголовками nginx кладёт пользователя: на чтении ему видны и его личные позиции', () => {
    const { context, request } = contextFor(fromNginx);
    expect(new IdentifyGuard().canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 7, role: 'USER' });
  });

  it.each([
    ['id не число', { 'x-user-id': 'abc', 'x-user-role': 'USER' }],
    ['id ноль', { 'x-user-id': '0', 'x-user-role': 'USER' }],
    ['id дробный', { 'x-user-id': '7.5', 'x-user-role': 'USER' }],
    ['незнакомая роль', { 'x-user-id': '7', 'x-user-role': 'ROOT' }],
    ['без роли', { 'x-user-id': '7' }],
  ])('кривые заголовки (%s) — аноним, а не пользователь', (_name, headers) => {
    const { context, request } = contextFor(headers);
    expect(new IdentifyGuard().canActivate(context)).toBe(true);
    expect(request.user).toBeUndefined();
  });
});

describe('AuthGuard', () => {
  it('пускает вошедшего и кладёт его в request', () => {
    const { context, request } = contextFor({ 'x-user-id': '1', 'x-user-role': 'ADMIN' });
    expect(new AuthGuard().canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 1, role: 'ADMIN' });
  });

  it('аноним — 401', () => {
    expect(() => new AuthGuard().canActivate(contextFor().context)).toThrow(UnauthorizedException);
  });

  it('пользователя, которого уже узнал IdentifyGuard, пускает как есть', () => {
    const { context, request } = contextFor();
    request.user = { id: 7, role: 'USER' };
    expect(new AuthGuard().canActivate(context)).toBe(true);
  });
});

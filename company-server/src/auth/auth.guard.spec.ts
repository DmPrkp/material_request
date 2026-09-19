import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth-user';

function contextFor(headers: Record<string, string> = {}): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
} {
  const request = { headers } as unknown as AuthenticatedRequest;
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  return { context, request };
}

describe('AuthGuard', () => {
  it('пускает с заголовками nginx и кладёт пользователя в request', () => {
    const { context, request } = contextFor({ 'x-user-id': '7', 'x-user-role': 'USER' });
    expect(new AuthGuard().canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 7, role: 'USER' });
  });

  it('без заголовков — 401: анонимного чтения нет', () => {
    expect(() => new AuthGuard().canActivate(contextFor().context)).toThrow(UnauthorizedException);
  });

  it.each([
    ['id не число', { 'x-user-id': 'abc', 'x-user-role': 'USER' }],
    ['id отрицательный', { 'x-user-id': '-7', 'x-user-role': 'USER' }],
    ['незнакомая роль', { 'x-user-id': '7', 'x-user-role': 'ROOT' }],
    ['без роли', { 'x-user-id': '7' }],
  ])('кривые заголовки (%s) — 401', (_name, headers) => {
    expect(() => new AuthGuard().canActivate(contextFor(headers).context)).toThrow(UnauthorizedException);
  });
});

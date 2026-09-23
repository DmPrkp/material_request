import { describe, expect, it } from 'vitest';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AuthGuard, IdentifyGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth-user';

function contextFor(headers: Record<string, string> = {}) {
  const request = { headers } as unknown as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('IdentifyGuard', () => {
  it('без заголовков — аноним: заявку заводят и без входа', () => {
    const { context, request } = contextFor();
    expect(new IdentifyGuard().canActivate(context)).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('с заголовками nginx кладёт пользователя', () => {
    const { context, request } = contextFor({
      'x-user-id': '7',
      'x-user-role': 'USER',
    });
    expect(new IdentifyGuard().canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 7, role: 'USER' });
  });

  it('кривые заголовки — аноним, а не пользователь', () => {
    const { context, request } = contextFor({
      'x-user-id': 'abc',
      'x-user-role': 'ADMIN',
    });
    expect(new IdentifyGuard().canActivate(context)).toBe(true);
    expect(request.user).toBeUndefined();
  });
});

describe('AuthGuard', () => {
  it('пускает вошедшего', () => {
    const { context, request } = contextFor({
      'x-user-id': '1',
      'x-user-role': 'ADMIN',
    });
    expect(new AuthGuard().canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 1, role: 'ADMIN' });
  });

  it('аноним — 401', () => {
    expect(() => new AuthGuard().canActivate(contextFor().context)).toThrow(UnauthorizedException);
  });
});

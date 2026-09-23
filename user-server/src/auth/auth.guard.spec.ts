import { describe, expect, it, vi } from 'vitest';

import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role, User } from '~/db/schema';
import { UsersService } from '../users/users.service';
import { AuthGuard } from './auth.guard';
import { AuthenticatedRequest, Public, Roles } from './decorators';

class TestController {
  @Public()
  open() {}

  closed() {}

  @Roles('ADMIN')
  adminOnly() {}
}

const makeUser = (id: number, role: Role): User => ({
  id,
  login: `user${id}`,
  password: 'hash',
  firstName: 'Test',
  lastName: null,
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('AuthGuard', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });
  const stored = [makeUser(1, 'ADMIN'), makeUser(2, 'USER')];
  const usersService = {
    findById: vi.fn((id: number) => Promise.resolve(stored.find((user) => user.id === id) ?? null)),
  } as unknown as UsersService;
  const guard = new AuthGuard(jwtService, usersService, new Reflector());

  const tokenFor = (id: number, role: Role) =>
    `Bearer ${jwtService.sign({ sub: id, login: `user${id}`, role })}`;

  function run(handler: keyof TestController, authorization?: string) {
    const request = { headers: { authorization } } as AuthenticatedRequest;
    const context = {
      getHandler: () => Object.getOwnPropertyDescriptor(TestController.prototype, handler)?.value as unknown,
      getClass: () => TestController,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { request, result: guard.canActivate(context) };
  }

  it('lets anyone through a @Public() handler', async () => {
    await expect(run('open').result).resolves.toBe(true);
  });

  it('rejects a closed handler without a token or with a bad one', async () => {
    await expect(run('closed').result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(run('closed', 'Bearer garbage').result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(run('closed', 'Basic abc').result).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('puts the user without the password hash on the request', async () => {
    const { request, result } = run('closed', tokenFor(2, 'USER'));

    await expect(result).resolves.toBe(true);
    expect(request.user).toMatchObject({ id: 2, role: 'USER' });
    expect(request.user).not.toHaveProperty('password');
  });

  it('rejects a valid token of a user that no longer exists', async () => {
    await expect(run('closed', tokenFor(99, 'ADMIN')).result).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('checks the role stored in the database, not the one in the token', async () => {
    await expect(run('adminOnly', tokenFor(1, 'ADMIN')).result).resolves.toBe(true);
    await expect(run('adminOnly', tokenFor(2, 'ADMIN')).result).rejects.toBeInstanceOf(ForbiddenException);
  });
});

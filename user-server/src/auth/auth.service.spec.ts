import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import { hashPassword } from '../users/password';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });
  let users: jest.Mocked<Pick<UsersService, 'create' | 'findByLogin' | 'findById' | 'updatePassword'>>;
  let service: AuthService;
  let ivan: User;

  beforeAll(async () => {
    ivan = {
      id: 2,
      login: 'ivan',
      password: await hashPassword('secret1'),
      firstName: 'Иван',
      lastName: null,
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  beforeEach(() => {
    users = {
      create: jest.fn(),
      findByLogin: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn(),
    };
    service = new AuthService(users as unknown as UsersService, jwtService);
  });

  it('register stores a hash, not the password, and never returns it', async () => {
    users.create.mockImplementation(async (data) => ({ ...ivan, ...data }) as User);

    const result = await service.register({ login: 'ivan', password: 'secret1', firstName: 'Иван' });

    const saved = users.create.mock.calls[0][0];
    expect(saved.password).not.toBe('secret1');
    expect(saved.lastName).toBeNull();
    expect(saved).not.toHaveProperty('role');
    expect(result.user).not.toHaveProperty('password');
    expect(jwtService.verify(result.accessToken)).toMatchObject({ sub: 2, login: 'ivan', role: Role.USER });
  });

  it('login succeeds with the right password', async () => {
    users.findByLogin.mockResolvedValue(ivan);

    const result = await service.login({ login: 'ivan', password: 'secret1' });

    expect(result.user).toMatchObject({ id: 2, login: 'ivan' });
    expect(result.user).not.toHaveProperty('password');
  });

  it('login rejects a wrong password and an unknown login the same way', async () => {
    users.findByLogin.mockResolvedValueOnce(ivan).mockResolvedValueOnce(null);

    await expect(service.login({ login: 'ivan', password: 'wrong' })).rejects.toThrow(
      new UnauthorizedException('Invalid login or password'),
    );
    await expect(service.login({ login: 'nobody', password: 'secret1' })).rejects.toThrow(
      new UnauthorizedException('Invalid login or password'),
    );
  });

  it('changePassword checks the current password before saving a new hash', async () => {
    users.findById.mockResolvedValue(ivan);

    await expect(
      service.changePassword(2, { currentPassword: 'wrong', newPassword: 'another1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.updatePassword).not.toHaveBeenCalled();

    await service.changePassword(2, { currentPassword: 'secret1', newPassword: 'another1' });
    const [id, newHash] = users.updatePassword.mock.calls[0];
    expect(id).toBe(2);
    expect(newHash).not.toBe('another1');
  });

  it('refresh re-reads the user and issues a fresh token; a deleted user gets none', async () => {
    users.findById.mockResolvedValueOnce({ ...ivan, role: Role.ADMIN }).mockResolvedValueOnce(null);

    const result = await service.refresh(2);

    // Роль из базы, а не из старого токена: повышение видно сразу после продления.
    expect(jwtService.verify(result.accessToken)).toMatchObject({ sub: 2, login: 'ivan', role: Role.ADMIN });
    expect(result.user).not.toHaveProperty('password');
    await expect(service.refresh(99)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

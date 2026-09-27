import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';

import type { User, UserToken } from '~/db/schema';
import type { MailClient } from '~/mail/mail.client';
import type { VerificationMailer } from '~/mail/verification.mailer';
import type { TokensService } from '~/tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const ivan: User = {
  id: 2,
  login: 'ivan',
  password: 'хеш',
  firstName: 'Иван',
  lastName: null,
  email: 'ivan@example.com',
  emailVerifiedAt: null,
  role: 'USER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tokenRow = (patch: Partial<UserToken> = {}): UserToken => ({
  id: 1,
  userId: ivan.id,
  type: 'verify',
  tokenHash: 'неважно',
  email: 'ivan@example.com',
  expiresAt: new Date(Date.now() + 3600_000),
  usedAt: new Date(),
  createdAt: new Date(),
  ...patch,
});

describe('подтверждение адреса и восстановление пароля', () => {
  let users: Mocked<
    Pick<
      UsersService,
      'create' | 'findById' | 'findByVerifiedEmail' | 'updatePassword' | 'markEmailVerified'
    >
  >;
  let tokens: Mocked<Pick<TokensService, 'issue' | 'consume'>>;
  let mail: Mocked<Pick<MailClient, 'send'>>;
  let verification: Mocked<Pick<VerificationMailer, 'send'>>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      create: vi.fn((data) => Promise.resolve({ ...ivan, ...data }) as Promise<User>),
      findById: vi.fn(),
      findByVerifiedEmail: vi.fn(),
      updatePassword: vi.fn(),
      markEmailVerified: vi.fn(),
    };
    tokens = { issue: vi.fn().mockResolvedValue({ token: 'сырой-токен', hours: 2 }), consume: vi.fn() };
    mail = { send: vi.fn().mockResolvedValue(true) };
    verification = { send: vi.fn().mockResolvedValue(true) };

    service = new AuthService(
      users as unknown as UsersService,
      new JwtService({ secret: 'test-secret' }),
      tokens as unknown as TokensService,
      mail as unknown as MailClient,
      verification as unknown as VerificationMailer,
    );
  });

  describe('регистрация', () => {
    it('с почтой — шлёт письмо с подтверждением', async () => {
      await service.register({
        login: 'ivan',
        password: 'secret1',
        firstName: 'Иван',
        email: 'ivan@example.com',
        locale: 'ru',
      });

      expect(verification.send).toHaveBeenCalledWith(2, 'ivan@example.com', 'Иван', 'ru');
    });

    it('без почты — письма нет, регистрация проходит', async () => {
      users.create.mockResolvedValue({ ...ivan, email: null });

      const result = await service.register({
        login: 'ivan',
        password: 'secret1',
        firstName: 'Иван',
        locale: 'ru',
      });

      expect(verification.send).not.toHaveBeenCalled();
      expect(result.accessToken).toBeTruthy();
    });

    it('письмо не ушло — аккаунт всё равно заведён', async () => {
      // Иначе человеку пришлось бы регистрироваться заново из-за чужой поломки.
      verification.send.mockResolvedValue(false);

      await expect(
        service.register({
          login: 'ivan',
          password: 'secret1',
          firstName: 'Иван',
          email: 'ivan@example.com',
          locale: 'ru',
        }),
      ).resolves.toHaveProperty('accessToken');
    });
  });

  describe('подтверждение адреса', () => {
    it('живая ссылка ставит отметку', async () => {
      tokens.consume.mockResolvedValue(tokenRow());
      users.findById.mockResolvedValue(ivan);

      await service.verifyEmail('сырой-токен');

      expect(users.markEmailVerified).toHaveBeenCalledWith(2);
    });

    it('использованная или протухшая — 400', async () => {
      tokens.consume.mockResolvedValue(undefined);

      await expect(service.verifyEmail('старый')).rejects.toThrow(BadRequestException);
      expect(users.markEmailVerified).not.toHaveBeenCalled();
    });

    it('адрес сменили после отправки письма — старая ссылка не подтверждает новый', async () => {
      tokens.consume.mockResolvedValue(tokenRow({ email: 'старый@example.com' }));
      users.findById.mockResolvedValue(ivan);

      await expect(service.verifyEmail('сырой-токен')).rejects.toThrow(BadRequestException);
      expect(users.markEmailVerified).not.toHaveBeenCalled();
    });

    it('уже подтверждённый адрес — не ошибка и повторной отметки нет', async () => {
      tokens.consume.mockResolvedValue(tokenRow());
      users.findById.mockResolvedValue({ ...ivan, emailVerifiedAt: new Date() });

      await expect(service.verifyEmail('сырой-токен')).resolves.toBeUndefined();
      expect(users.markEmailVerified).not.toHaveBeenCalled();
    });
  });

  describe('забыли пароль', () => {
    it('неизвестный адрес — молчим: иначе форма покажет, кто зарегистрирован', async () => {
      users.findByVerifiedEmail.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'никого@example.com', locale: 'ru' }),
      ).resolves.toBeUndefined();
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('подтверждённый адрес — письмо со ссылкой на сброс', async () => {
      users.findByVerifiedEmail.mockResolvedValue({ ...ivan, emailVerifiedAt: new Date() });

      await service.forgotPassword({ email: 'ivan@example.com', locale: 'en' });

      expect(tokens.issue).toHaveBeenCalledWith(2, 'reset', 'ivan@example.com');
      const letter = mail.send.mock.calls[0][0];
      expect(letter.template).toBe('reset');
      expect(letter.locale).toBe('en');
      expect(letter.link).toContain('/en/auth/reset?token=');
      expect(letter.hours).toBe(2);
    });
  });

  describe('смена пароля по ссылке', () => {
    it('живая ссылка ставит новый пароль хешем, а не как есть', async () => {
      tokens.consume.mockResolvedValue(tokenRow({ type: 'reset' }));
      users.findById.mockResolvedValue(ivan);

      await service.resetPassword({ token: 'сырой-токен', newPassword: 'новый-пароль' });

      const [id, stored] = users.updatePassword.mock.calls[0];
      expect(id).toBe(2);
      expect(stored).not.toBe('новый-пароль');
      expect(stored.startsWith('$2')).toBe(true);
    });

    it('битая ссылка — 400, пароль не трогаем', async () => {
      tokens.consume.mockResolvedValue(undefined);

      await expect(
        service.resetPassword({ token: 'мусор', newPassword: 'новый-пароль' }),
      ).rejects.toThrow(BadRequestException);
      expect(users.updatePassword).not.toHaveBeenCalled();
    });
  });
});

import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { hashPassword } from '../users/password';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { TelegramAuthDto } from './dto/auth.dto';
import { verifyTelegramAuth } from './telegram-auth';

@Injectable()
export class TelegramAuthService {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Вход через Telegram. Незнакомого заводим сразу: кнопка «Войти» не должна упираться
   * в «сначала зарегистрируйтесь». Пароль случайный и никому не известен — войти по нему
   * нельзя, пока человек сам не сменит его (смена требует текущий, так что только через
   * подтверждённую почту и сброс).
   */
  async login(dto: TelegramAuthDto) {
    this.verify(dto);

    const existing = await this.users.findByTelegramId(dto.id);
    if (existing) return this.auth.buildAuthResponse(existing);

    const user = await this.users.create({
      login: `tg${dto.id}`,
      password: await hashPassword(randomBytes(32).toString('hex')),
      firstName: dto.first_name,
      lastName: typeof dto.last_name === 'string' && dto.last_name ? dto.last_name : null,
      telegramId: dto.id,
    });
    return this.auth.buildAuthResponse(user);
  }

  /** Привязка к уже вошедшему: так входящие по логину получают кнопку, не плодя второй аккаунт. */
  async link(userId: number, dto: TelegramAuthDto) {
    this.verify(dto);
    const user = await this.users.setTelegramId(userId, dto.id);
    return this.auth.buildAuthResponse(user);
  }

  private verify(dto: TelegramAuthDto): void {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) throw new ServiceUnavailableException('Вход через Telegram не настроен');
    if (!verifyTelegramAuth(dto, token)) throw new UnauthorizedException('Invalid Telegram signature');
  }
}

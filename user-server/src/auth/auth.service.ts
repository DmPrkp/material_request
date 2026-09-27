import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '~/db/schema';
import type { Locale } from '~/mail/links';
import { resetLink } from '~/mail/links';
import { MailClient } from '~/mail/mail.client';
import { VerificationMailer } from '~/mail/verification.mailer';
import { TokensService } from '~/tokens/tokens.service';
import { hashPassword, verifyPassword } from '../users/password';
import { toPublicUser } from '../users/public-user';
import { UsersService } from '../users/users.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly tokens: TokensService,
    private readonly mail: MailClient,
    private readonly verification: VerificationMailer,
  ) {}

  // Роль при регистрации не принимается — только USER по умолчанию из схемы.
  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      login: dto.login,
      password: await hashPassword(dto.password),
      firstName: dto.firstName,
      lastName: dto.lastName || null,
      email: dto.email ?? null,
    });

    // Почта необязательна, и подтверждение не блокирует вход: человек сразу работает,
    // а письмо ждёт его в ящике. Не ушло — аккаунт всё равно заведён (MailClient не бросает).
    if (user.email) await this.verification.send(user.id, user.email, user.firstName, dto.locale);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByLogin(dto.login);
    const passwordMatch = await verifyPassword(dto.password, user?.password);
    if (!user || !passwordMatch) {
      throw new UnauthorizedException('Invalid login or password');
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Свежий токен взамен ещё живого — клиент меняет его раз в сутки. Пользователя
   * перечитываем: удалённому новый не выдаём, а сменённая роль попадёт в токен сразу,
   * а не через JWT_EXPIRES_IN.
   */
  async refresh(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.buildAuthResponse(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    // 403, а не 401: сессия-то валидна, и клиент не должен принять это за протухший токен.
    if (!user || !(await verifyPassword(dto.currentPassword, user.password))) {
      throw new ForbiddenException('Current password is incorrect');
    }

    await this.usersService.updatePassword(user.id, await hashPassword(dto.newPassword));
  }

  /** Переслать письмо: первое могло не дойти или протухнуть. */
  async requestEmailVerification(userId: number, locale: Locale): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new BadRequestException('В профиле нет почты');
    if (user.emailVerifiedAt) throw new BadRequestException('Адрес уже подтверждён');

    await this.verification.send(user.id, user.email, user.firstName, locale);
  }

  /** Подтверждение адреса по ссылке из письма. Повторный переход — уже недействителен. */
  async verifyEmail(token: string): Promise<void> {
    const record = await this.tokens.consume(token, 'verify');
    if (!record) throw new BadRequestException('Ссылка недействительна или устарела');

    const user = await this.usersService.findById(record.userId);
    if (!user) throw new BadRequestException('Ссылка недействительна или устарела');

    // Адрес успели сменить после отправки письма — старая ссылка не должна подтверждать новый.
    if (user.email !== record.email) throw new BadRequestException('Ссылка выписана на другой адрес');

    // Уже подтверждён (кликнули по письму дважды с разных устройств) — это не ошибка.
    if (user.emailVerifiedAt) return;

    // Занятый кем-то другим подтверждённый адрес поймает частичный уникальный индекс — 409.
    await this.usersService.markEmailVerified(user.id);
  }

  /**
   * «Забыли пароль». Ответ одинаков независимо от того, есть такой адрес или нет:
   * иначе форма превращается в проверялку, зарегистрирован ли человек в приложении.
   * По той же причине молчим и когда адрес есть, но не подтверждён.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByVerifiedEmail(dto.email);
    if (!user?.email) return;

    const { token, hours } = await this.tokens.issue(user.id, 'reset', user.email);
    await this.mail.send({
      to: user.email,
      template: 'reset',
      locale: dto.locale,
      link: resetLink(token, dto.locale),
      name: user.firstName,
      hours,
    });
  }

  /**
   * Новый пароль по ссылке из письма.
   *
   * Уже выданные токены при этом не протухают: отозвать JWT нечем, они живут до
   * JWT_EXPIRES_IN. Если это когда-нибудь станет важно — нужна версия токена в payload
   * и её сверка в guard.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.tokens.consume(dto.token, 'reset');
    if (!record) throw new BadRequestException('Ссылка недействительна или устарела');

    const user = await this.usersService.findById(record.userId);
    if (!user) throw new BadRequestException('Ссылка недействительна или устарела');

    await this.usersService.updatePassword(user.id, await hashPassword(dto.newPassword));
  }

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = { sub: user.id, login: user.login, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user: toPublicUser(user),
    };
  }
}

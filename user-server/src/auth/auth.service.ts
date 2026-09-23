import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '~/db/schema';
import { hashPassword, verifyPassword } from '../users/password';
import { toPublicUser } from '../users/public-user';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Роль при регистрации не принимается — только USER по умолчанию из схемы.
  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      login: dto.login,
      password: await hashPassword(dto.password),
      firstName: dto.firstName,
      lastName: dto.lastName || null,
    });

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

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = { sub: user.id, login: user.login, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user: toPublicUser(user),
    };
  }
}

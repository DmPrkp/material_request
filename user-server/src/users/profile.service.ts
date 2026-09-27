import { Injectable } from '@nestjs/common';

import type { User } from '~/db/schema';
import { VerificationMailer } from '~/mail/verification.mailer';
import type { UpdateMeDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersService: UsersService,
    private readonly verification: VerificationMailer,
  ) {}

  /**
   * Правка своего профиля. Почта — отдельным шагом: её смена сбрасывает подтверждение
   * и тянет за собой письмо, а имя с фамилией просто пишутся.
   */
  async updateMe(userId: number, dto: UpdateMeDto): Promise<User> {
    let user = await this.usersService.findById(userId);
    if (!user) throw new Error(`Пользователь ${userId} исчез между проверкой токена и правкой`);

    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      user = await this.usersService.updateProfile(userId, {
        firstName: dto.firstName ?? user.firstName,
        lastName: dto.lastName === undefined ? user.lastName : dto.lastName,
      });
    }

    // Тот же адрес повторно не подтверждаем: иначе сохранение формы с нетронутой почтой
    // сбрасывало бы уже сделанное подтверждение и слало лишнее письмо.
    if (dto.email !== undefined && dto.email !== user.email) {
      user = await this.usersService.updateEmail(userId, dto.email);
      if (user.email) {
        await this.verification.send(user.id, user.email, user.firstName, dto.locale);
      }
    }

    return user;
  }
}

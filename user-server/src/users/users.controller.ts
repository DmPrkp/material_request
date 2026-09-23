import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { PublicUser, toPublicUser } from './public-user';
import { parseIds, toUserName, UserName } from './user-name';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('ADMIN')
  @Get()
  async list(): Promise<PublicUser[]> {
    const users = await this.usersService.findAll();
    return users.map(toPublicUser);
  }

  /**
   * Имена по id — любому вошедшему. Как у словаря: перечисление закрыто (список — админу),
   * а ссылку, которая у спрашивающего уже есть (id участника компании, держателя), —
   * разрешаем. Неизвестных id в ответе просто нет.
   */
  @Get('names')
  async names(@Query('ids') ids: string | undefined): Promise<UserName[]> {
    const users = await this.usersService.findByIds(parseIds(ids));
    return users.map(toUserName);
  }
}

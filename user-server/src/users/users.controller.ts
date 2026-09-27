import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators';
import { UpdateMeDto } from './dto/user.dto';
import { ProfileService } from './profile.service';
import { PublicUser, toPublicUser } from './public-user';
import { parseIds, toUserName, UserName } from './user-name';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Своё — правит только сам владелец: id берём из токена, а не из пути, поэтому чужой
   * профиль этой ручкой не достать вовсе.
   */
  @Patch('me')
  async updateMe(@CurrentUser() user: PublicUser, @Body() dto: UpdateMeDto): Promise<PublicUser> {
    return toPublicUser(await this.profileService.updateMe(user.id, dto));
  }

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

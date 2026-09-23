import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';

import { type AdminRequest, Public } from './auth.guard';
import { UserServerClient } from './user-server.client';

@Controller('auth')
export class AuthController {
  constructor(private readonly users: UserServerClient) {}

  /**
   * Тот же вход, что в приложении, но токен не-админа не отдаём: иначе клиент сохранил бы
   * его и получал 403 на каждой таблице вместо внятного отказа на форме входа.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown) {
    const result = await this.users.login(body);
    if (result.user.role !== 'ADMIN') throw new ForbiddenException('Нужна роль ADMIN');
    return result;
  }

  @Get('me')
  me(@Req() request: AdminRequest) {
    return request.user;
  }
}

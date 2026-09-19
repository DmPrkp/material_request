import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '~/auth/current-user.decorator';
import type { AuthUser } from '~/auth/auth-user';
import { ListQueryDto } from '~/common/list-query.dto';
import { CreateCompanyDto, MemberRolesDto, UpdateCompanyDto } from './companies.dto';
import { CompaniesService } from './companies.service';

/** Все методы — со входом: AuthGuard висит на всём приложении (auth.module.ts). */
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  /** Компании, где я участник, с моими ролями: ?page, ?limit, ?q (подстрока названия). */
  @Get()
  list(@Query() query: ListQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.byId(id, user);
  }

  /** Создатель становится владельцем (own). */
  @Post()
  create(@Body() dto: CreateCompanyDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }

  @Get(':id/members')
  members(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.members(id, user);
  }

  /** Добавить участника или заменить ему роли целиком: { roles: [...] }. */
  @Put(':id/members/:userId')
  setMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: MemberRolesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.setMember(id, userId, dto.roles, user);
  }

  /** Убрать участника; свой id — выйти из компании. */
  @Delete(':id/members/:userId')
  @HttpCode(204)
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeMember(id, userId, user);
  }
}

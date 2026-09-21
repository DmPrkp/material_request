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
import { hardDeleteQuery } from '~/common/delete-query';
import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseQueryDto } from './warehouses.dto';
import { WarehousesService } from './warehouses.service';

/** Все методы — со входом: AuthGuard висит на всём приложении (auth.module.ts). */
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  /**
   * Свои и назначенные склады: ?page, ?limit, ?q (название или адрес),
   * ?state=active|archived|all. ?companyId — склады компании: её own/manage видят все.
   */
  @Get()
  list(@Query() query: WarehouseQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.byId(id, user);
  }

  @Post()
  create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  /** По умолчанию мягко (is_active = false), ?hard=true — физически. */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: { hard?: string },
    @CurrentUser() user: AuthUser,
  ) {
    if (hardDeleteQuery(query)) {
      await this.service.remove(id, user);
      return { deleted: true, mode: 'hard' as const };
    }
    return { deleted: true, mode: 'soft' as const, item: await this.service.archive(id, user) };
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.restore(id, user);
  }

  @Get(':id/users')
  users(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.users(id, user);
  }

  /** Назначить участника компании склада (только чтение); повторно — не ошибка. */
  @Put(':id/users/:userId')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.assign(id, userId, user);
  }

  /** Снять с назначения; свой id — отказаться от склада самому. */
  @Delete(':id/users/:userId')
  @HttpCode(204)
  unassign(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.unassign(id, userId, user);
  }
}

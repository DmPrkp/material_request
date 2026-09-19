import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '~/auth/current-user.decorator';
import type { AuthUser } from '~/auth/auth-user';
import { hardDeleteQuery } from '~/common/delete-query';
import { ListQueryDto } from '~/common/list-query.dto';
import { CreateWarehouseDto, UpdateWarehouseDto } from './warehouses.dto';
import { WarehousesService } from './warehouses.service';

/** Все методы — со входом: AuthGuard висит на всём приложении (auth.module.ts). */
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  /** Свои склады: ?page, ?limit, ?q (название или адрес), ?state=active|archived|all. */
  @Get()
  list(@Query() query: ListQueryDto, @CurrentUser() user: AuthUser) {
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
}

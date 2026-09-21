import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '~/auth/current-user.decorator';
import type { AuthUser } from '~/auth/auth-user';
import { AddItemsDto, UpdateItemDto } from './items.dto';
import { WarehouseItemsService } from './items.service';

/** Содержимое склада: ведёт его любой, кому склад виден (items.service.ts). */
@Controller('warehouses/:id/items')
export class WarehouseItemsController {
  constructor(private readonly service: WarehouseItemsService) {}

  @Get()
  list(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.list(id, user);
  }

  /** Пачка позиций одной транзакцией; та же позиция складывается с лежащей. */
  @Post()
  add(@Param('id', ParseIntPipe) id: number, @Body() dto: AddItemsDto, @CurrentUser() user: AuthUser) {
    return this.service.add(id, dto.items, user);
  }

  @Patch(':itemId')
  setQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.setQuantity(id, itemId, dto.quantity, user);
  }

  @Delete(':itemId')
  @HttpCode(204)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, itemId, user);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '~/auth/current-user.decorator';
import type { AuthUser } from '~/auth/auth-user';
import { AddItemsDto, IssueItemsDto, MoveItemsDto, RemoveItemsDto, UpdateItemDto } from './items.dto';
import { WarehouseItemsService } from './items.service';

/** Содержимое склада: ведёт его любой, кому склад виден, «руки» — own/manage (items.service.ts). */
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

  /**
   * Групповое удаление — POST, а не DELETE с телом: тело у DELETE прокси и клиенты
   * вправе выбросить. Все или ничего; у каждой позиции — сколько снять (можно часть).
   */
  @Post('remove')
  @HttpCode(204)
  removeMany(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RemoveItemsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeMany(id, dto.items, user);
  }

  /** Переложить выбранное (можно часть количества) на склад той же компании (access.ts → canMoveItems). */
  @Post('move')
  move(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveItemsDto, @CurrentUser() user: AuthUser) {
    return this.service.move(id, dto.items, dto.targetWarehouseId, user);
  }

  /** Выдать выбранное на руки участнику компании склада (items.service.ts → issue). */
  @Post('issue')
  issue(@Param('id', ParseIntPipe) id: number, @Body() dto: IssueItemsDto, @CurrentUser() user: AuthUser) {
    return this.service.issue(id, dto.items, dto.userId, user);
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

/** Что у спрашивающего на руках — из всех компаний сразу. */
@Controller('holdings')
export class HoldingsController {
  constructor(private readonly service: WarehouseItemsService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.service.mine(user);
  }
}

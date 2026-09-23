import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { AuthUser } from '~/auth/auth-user';
import { AuthGuard, IdentifyGuard } from '~/auth/auth.guard';
import { CurrentUser } from '~/auth/current-user.decorator';

import { ClaimDto, ZaiavkaBodyDto } from './zaiavka.dto';
import { ZaiavkaService } from './zaiavka.service';

/** Ключ правки ничьей заявки — отдельным заголовком: Authorization занят токеном. */
export const ZAIAVKA_KEY_HEADER = 'x-zaiavka-key';

@Controller('zaiavka')
@UseGuards(IdentifyGuard)
export class ZaiavkaController {
  constructor(private readonly zaiavkaService: ZaiavkaService) {}

  /** Без входа — ничья заявка, в ответе ключ правки. */
  @Post()
  create(@Body() body: ZaiavkaBodyDto, @CurrentUser() user?: AuthUser) {
    return this.zaiavkaService.create(body, user);
  }

  @Post('claim')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  claim(@Body() body: ClaimDto, @CurrentUser() user: AuthUser) {
    return this.zaiavkaService.claim(user, body.items);
  }

  @Put(':id')
  put(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ZaiavkaBodyDto,
    @CurrentUser() user?: AuthUser,
    @Headers(ZAIAVKA_KEY_HEADER) key?: string,
  ) {
    return this.zaiavkaService.put(id, body, user, key);
  }

  /** Права — как у PUT; ничью удаляет тот, у кого ключ. Групповое удаление в списке — по одной. */
  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthUser,
    @Headers(ZAIAVKA_KEY_HEADER) key?: string,
  ) {
    return this.zaiavkaService.remove(id, user, key);
  }

  /**
   * Без входа: по этой ссылке заявкой делятся в мессенджерах, и открывает её не автор.
   * Скрываем перечисление (список — только свои), а не разрешение ссылки — как в словаре.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.zaiavkaService.get(id);
  }

  /** ?ids= — ничьи заявки этого браузера (без входа); без него — свои, со входом. */
  @Get()
  findAll(@CurrentUser() user?: AuthUser, @Query('ids') ids?: string) {
    if (ids !== undefined) return this.zaiavkaService.lookup(parseIds(ids));
    if (!user) throw new UnauthorizedException();
    return this.zaiavkaService.getAll(user);
  }
}

function parseIds(raw: string): number[] {
  const ids = raw.split(',').filter(Boolean).map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id < 1))
    throw new BadRequestException('ids: целые id через запятую');
  return ids;
}

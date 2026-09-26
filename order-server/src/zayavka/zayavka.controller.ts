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

import { ClaimDto, ZayavkaBodyDto } from './zayavka.dto';
import { ZayavkaService } from './zayavka.service';

/** Ключ правки ничьей заявки — отдельным заголовком: Authorization занят токеном. */
export const ZAYAVKA_KEY_HEADER = 'x-zayavka-key';

@Controller('zayavka')
@UseGuards(IdentifyGuard)
export class ZayavkaController {
  constructor(private readonly zayavkaService: ZayavkaService) {}

  /** Без входа — ничья заявка, в ответе ключ правки. */
  @Post()
  create(@Body() body: ZayavkaBodyDto, @CurrentUser() user?: AuthUser) {
    return this.zayavkaService.create(body, user);
  }

  @Post('claim')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  claim(@Body() body: ClaimDto, @CurrentUser() user: AuthUser) {
    return this.zayavkaService.claim(user, body.items);
  }

  @Put(':id')
  put(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ZayavkaBodyDto,
    @CurrentUser() user?: AuthUser,
    @Headers(ZAYAVKA_KEY_HEADER) key?: string,
  ) {
    return this.zayavkaService.put(id, body, user, key);
  }

  /** Права — как у PUT; ничью удаляет тот, у кого ключ. Групповое удаление в списке — по одной. */
  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthUser,
    @Headers(ZAYAVKA_KEY_HEADER) key?: string,
  ) {
    return this.zayavkaService.remove(id, user, key);
  }

  /**
   * Без входа: по этой ссылке заявкой делятся в мессенджерах, и открывает её не автор.
   * Скрываем перечисление (список — только свои), а не разрешение ссылки — как в словаре.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.zayavkaService.get(id);
  }

  /** ?ids= — ничьи заявки этого браузера (без входа); без него — свои, со входом. */
  @Get()
  findAll(@CurrentUser() user?: AuthUser, @Query('ids') ids?: string) {
    if (ids !== undefined) return this.zayavkaService.lookup(parseIds(ids));
    if (!user) throw new UnauthorizedException();
    return this.zayavkaService.getAll(user);
  }
}

function parseIds(raw: string): number[] {
  const ids = raw.split(',').filter(Boolean).map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id < 1))
    throw new BadRequestException('ids: целые id через запятую');
  return ids;
}

import {
  BadRequestException,
  Body,
  Controller,
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
import { ZaiavkaService } from './zaiavka.service';
import { CreateZaiavkaDto } from '../types/index';
import { IdentifyGuard, AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';

/** Ключ правки ничьей заявки — отдельным заголовком: Authorization занят токеном. */
export const ZAIAVKA_KEY_HEADER = 'x-zaiavka-key';

@Controller('zaiavka')
@UseGuards(IdentifyGuard)
export class ZaiavkaController {
  constructor(private readonly zaiavkaService: ZaiavkaService) {}

  /** Без входа — ничья заявка, в ответе ключ правки. */
  @Post()
  create(@Body() createZaiavkaDto: CreateZaiavkaDto, @CurrentUser() user?: AuthUser) {
    return this.zaiavkaService.create(createZaiavkaDto, user);
  }

  @Post('claim')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  claim(@Body() body: { items?: unknown }, @CurrentUser() user: AuthUser) {
    return this.zaiavkaService.claim(user, parseClaimItems(body?.items));
  }

  @Put(':id')
  put(
    @Param('id', ParseIntPipe) id: number,
    @Body() createZaiavkaDto: CreateZaiavkaDto,
    @CurrentUser() user?: AuthUser,
    @Headers(ZAIAVKA_KEY_HEADER) key?: string,
  ) {
    return this.zaiavkaService.put(id, createZaiavkaDto, user, key);
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
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) throw new BadRequestException('ids: целые id через запятую');
  return ids;
}

function parseClaimItems(raw: unknown): { id: number; key: string }[] {
  const valid =
    Array.isArray(raw) &&
    raw.every((item) => Number.isInteger(item?.id) && typeof item?.key === 'string' && item.key.length > 0);
  if (!valid) throw new BadRequestException('items: [{ id, key }]');
  return raw as { id: number; key: string }[];
}

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

import { SendDto } from './send.dto';
import { type Update, TelegramService } from './telegram.service';

function sameSecret(given: string | undefined, expected: string): boolean {
  const a = Buffer.from(given ?? '');
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Controller()
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  /**
   * Единственная ручка, открытая в nginx: её дёргает Telegram, входа пользователя тут нет.
   * Подлинность — по секрету, который мы сами передали в `setWebhook`; без него (или с
   * чужим) — 401, а без настроенного секрета ручка закрыта целиком.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: Update,
  ): Promise<void> {
    if (!this.telegram.secret) throw new ServiceUnavailableException('Webhook не настроен');
    if (!sameSecret(secret, this.telegram.secret)) throw new UnauthorizedException();
    await this.telegram.handle(update);
  }

  /** Для своих: в nginx не заведена, на проде порт не опубликован. */
  @Post('messages')
  @HttpCode(HttpStatus.ACCEPTED)
  async send(@Body() dto: SendDto): Promise<void> {
    await this.telegram.sendMessage(dto.chatId, dto.text);
  }
}

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { SendDto } from './dto/send.dto';
import { MailService } from './mail.service';

/**
 * Единственная ручка сервиса, и она только для своих: в nginx этот сервис не заведён,
 * снаружи в него не попасть (на проде порт не опубликован — как у остальных).
 * Гварда по X-User-* здесь нет намеренно: письма шлёт сервис от себя, а не от имени
 * пользователя — регистрация и «забыл пароль» случаются как раз до всякого входа.
 */
@Controller('messages')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  // 202: мы приняли письмо и отдали релею. Дошло ли оно до ящика — знает уже не сервис,
  // а панель SMTP.bz и DMARC-отчёты.
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  send(@Body() dto: SendDto) {
    return this.mailService.send(dto);
  }
}

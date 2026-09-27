import { Controller, Get, Header, Param } from '@nestjs/common';

import { LogsService } from './logs.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  /** Все записи всех файлов, новые сверху. */
  @Get()
  entries() {
    return this.logs.entries();
  }

  /** Файл как есть — для grep у себя и для того, чего разбор не понял. */
  @Get('files/:name')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  raw(@Param('name') name: string) {
    return this.logs.raw(name);
  }
}

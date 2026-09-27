import { type ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';

import { logError } from './error-log';

/**
 * То же, что PgConstraintFilter у сервисов с базой, но без разбора ошибок Postgres:
 * своей базы у почты нет. Задача одна — всё, что становится 5xx, положить в файл лога,
 * где мы поломки и ищем (common/error-log.ts).
 */
@Catch()
export class ServerErrorFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    // 4xx не пишем: это нормальная работа (не туда сходил вызывающий сервис), в файле
    // они утопили бы настоящие поломки.
    if (!(exception instanceof HttpException) || exception.getStatus() >= 500) {
      const request = host.switchToHttp().getRequest<Request | undefined>();
      logError(request ? `${request.method} ${request.originalUrl}` : 'вне запроса', exception);
    }

    super.catch(exception, host);
  }
}

import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';

import { logError } from './error-log';

type PgError = { code: string; constraint?: string; detail?: string };

/**
 * Нарушение ограничений БД -> 409 / 400 вместо 500.
 *
 * Уникальность (название системы, позиция этапа в системе) проверяет сама база:
 * предварительный SELECT не спасает от гонки двух одновременных вставок. Раньше
 * клиент на дубль получал 500 и не мог отличить его от падения сервиса.
 */
@Catch()
export class PgConstraintFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    const pg = findPgError(exception);

    // CHECK: например, правкой стёрли у технологии последнее название (*_name_present).
    // Это ошибка в данных запроса, а не конфликт с чужой записью — поэтому 400.
    if (pg?.code === '23514') {
      return super.catch(
        new BadRequestException({
          error: 'constraint_violated',
          message: 'Данные нарушают условие таблицы',
          constraint: pg.constraint,
        }),
        host,
      );
    }

    if (pg?.code === '23505') {
      return super.catch(
        new ConflictException({
          error: 'already_exists',
          message: 'Такая запись уже есть',
          constraint: pg.constraint,
          detail: pg.detail,
        }),
        host,
      );
    }

    if (pg?.code === '23503') {
      return super.catch(
        new ConflictException({
          error: 'broken_reference',
          message: 'Ссылка на несуществующую или используемую запись',
          constraint: pg.constraint,
          detail: pg.detail,
        }),
        host,
      );
    }

    // Сюда доходит всё, что станет 5xx, — и только оно попадает в файл лога: ветки выше
    // уже превратили нарушения ограничений в ответ клиенту, это не поломка сервиса.
    logServerError(exception, host);
    super.catch(exception, host);
  }
}

/** 4xx не пишем: это нормальная работа, в файле они утопили бы настоящие поломки. */
function logServerError(exception: unknown, host: ArgumentsHost): void {
  if (exception instanceof HttpException && exception.getStatus() < 500) return;

  const request = host.switchToHttp().getRequest<Request | undefined>();
  const where = request ? `${request.method} ${request.originalUrl}` : 'вне запроса';
  logError(where, exception);
}

/** Drizzle заворачивает ошибку pg в свою, настоящая лежит в cause. */
function findPgError(error: unknown, depth = 0): PgError | undefined {
  if (!error || typeof error !== 'object' || depth > 3) return undefined;
  const { code, cause } = error as { code?: unknown; cause?: unknown };
  if (typeof code === 'string' && /^\d{2}[0-9A-Z]{3}$/.test(code)) return error as PgError;
  return findPgError(cause, depth + 1);
}

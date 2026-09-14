import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';

import { localize, resolveLocale } from './localize';

/** Сворачивает nameRu/nameEn в name на языке из Accept-Language — см. localize.ts. */
@Injectable()
export class LocalizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    // Один адрес — разные тела в зависимости от языка: кэшам нужно об этом знать.
    http.getResponse<Response>().setHeader('Vary', 'Accept-Language');

    // Форме правки нужны оба языка сразу: ?translations=all отдаёт поля как в базе.
    if (request.query.translations === 'all') return next.handle();

    const locale = resolveLocale(request.headers['accept-language']);

    return next.handle().pipe(map((body: unknown) => localize(body, locale)));
  }
}

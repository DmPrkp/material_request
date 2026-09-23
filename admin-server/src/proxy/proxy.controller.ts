import { All, Controller, HttpStatus, NotFoundException, Param, Req, Res } from '@nestjs/common';
import type { Response } from 'express';

import type { AdminRequest } from '~/auth/auth.guard';

/**
 * Куда админка пишет. Только через API сервисов: SQL-ом мимо них прошли бы пересчёт кода
 * сборки, форки, неизменяемость значений параметров. Сервис видит вошедшего админа
 * (X-User-* — как их ставит nginx после проверки токена), так что права и created_by
 * те же, что у админа в приложении.
 *
 * Ходим по внутренней сети мимо nginx — как calc-server в словарь. Понадобится другой
 * сервис — строчка сюда.
 */
const SERVICES: Record<string, string> = {
  dict: process.env.DICTIONARY_URL ?? 'http://dictionary-server:4300/dict/api/v1',
};

@Controller('proxy')
export class ProxyController {
  @All(':service/*path')
  async forward(@Param('service') service: string, @Req() request: AdminRequest, @Res() response: Response) {
    const base = SERVICES[service];
    if (!base) throw new NotFoundException(`Нет сервиса ${service}`);

    // Хвост пути и query — как пришли: /admin/api/v1/proxy/dict/materials/7/variants?x=1 → /materials/7/variants?x=1
    const marker = `/proxy/${service}`;
    const tail = request.originalUrl.slice(request.originalUrl.indexOf(marker) + marker.length);

    const user = request.user!;
    const headers: Record<string, string> = {
      'X-User-Id': String(user.id),
      'X-User-Role': user.role,
      // Словарь отдаёт названия на языке запроса; админка русская.
      'Accept-Language': 'ru',
    };
    const hasBody = !['GET', 'HEAD'].includes(request.method);
    if (hasBody) headers['Content-Type'] = 'application/json';

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${base}${tail}`, {
        method: request.method,
        headers,
        body: hasBody ? JSON.stringify(request.body ?? {}) : undefined,
      });
    } catch {
      response.status(HttpStatus.BAD_GATEWAY).json({ message: `${service} недоступен` });
      return;
    }

    // Статус и тело — как ответил сервис: 409 на дубль сборки должен дойти до формы 409-м.
    const text = await upstream.text();
    response.status(upstream.status);
    const type = upstream.headers.get('content-type');
    if (type) response.type(type);
    response.send(text);
  }
}

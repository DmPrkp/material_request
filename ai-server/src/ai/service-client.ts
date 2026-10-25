import { Inject, Injectable } from '@nestjs/common';

import type { AuthUser } from '~/auth/auth-user';

import { AI_CONFIG, type AiConfig, type ServiceName } from './config';

const TIMEOUT_MS = 10_000;

/** Кто спрашивает и на каком языке ждёт названий из справочника (Accept-Language). */
export type Caller = AuthUser & { locale?: 'ru' | 'en' };

export type ServiceResult = { ok: boolean; status: number; body: unknown };

/**
 * Ходит в соседние сервисы **как пользователь**: передаёт его X-User-Id / X-User-Role — тем
 * же способом, каким это делает nginx. Сервисы заголовкам верят (на проде их порты закрыты,
 * см. auth-user.ts), поэтому права ассистента ровно равны правам пользователя: чужую заявку
 * или склад он не увидит, потому что их не увидит сам пользователь.
 *
 * Идентичность берётся только из запроса к самому ассистенту (его проверил nginx) и никогда —
 * из аргументов, которые придумала модель: иначе промпт-инъекция в тексте заявки поменяла бы
 * пользователя.
 */
@Injectable()
export class ServiceClient {
  constructor(@Inject(AI_CONFIG) private readonly config: AiConfig) {}

  async request(
    user: Caller,
    service: ServiceName,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<ServiceResult> {
    const response = await fetch(`${this.config.services[service]}${path}`, {
      method,
      headers: {
        'x-user-id': String(user.id),
        'x-user-role': user.role,
        'accept-language': user.locale ?? 'ru',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const text = await response.text();
    let parsed: unknown = text || null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // не JSON — отдаём как текст
    }
    return { ok: response.ok, status: response.status, body: parsed };
  }
}

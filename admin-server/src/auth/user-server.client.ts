import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';

export type AdminUser = {
  id: number;
  login: string;
  firstName: string;
  lastName: string | null;
  role: 'USER' | 'ADMIN';
};

/**
 * Вход и «кто это» — у user-server, по внутренней сети мимо nginx. Секрета JWT админка
 * не знает: токен проверяет его выпустивший, и роль он берёт из базы, а не из токена —
 * снятый админ теряет доступ сразу, а не через JWT_EXPIRES_IN.
 */
@Injectable()
export class UserServerClient {
  private readonly baseUrl = process.env.USER_SERVER_URL ?? 'http://user-server:4200/user/api/v1';

  login(body: unknown): Promise<{ accessToken: string; user: AdminUser }> {
    return this.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  me(token: string): Promise<AdminUser> {
    return this.request('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  }

  /** Ответ user-server с его статусом и телом: 401 на плохой пароль должен дойти до клиента 401-м. */
  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, init);
    } catch {
      throw new ServiceUnavailableException('user-server недоступен');
    }
    const body = await response.json().catch(() => undefined);
    if (!response.ok) throw new HttpException(body ?? response.statusText, response.status);
    return body as T;
  }
}

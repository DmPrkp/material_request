import { BadGatewayException, Injectable, UnauthorizedException } from '@nestjs/common';

import type { AuthUser } from '~/auth/auth-user';

/**
 * Компании живут в company-server, в другой базе. Ходим от имени пользователя: компания,
 * где он не участник, ответит 404 — для складов это «ролей в ней нет». Токена у нас нет
 * (его проверил и снял nginx), поэтому пользователь едет теми же заголовками X-User-*,
 * по внутренней сети compose, мимо nginx — как calc-server ходит в словарь.
 */
const DEFAULT_URL = 'http://company-server:4500/company/api/v1';

type CompanyView = { id: number; roles: string[] };
type MemberView = { userId: number; roles: string[] };

@Injectable()
export class CompanyClient {
  private readonly baseUrl = (process.env.COMPANY_URL || DEFAULT_URL).replace(/\/$/, '');

  /** Роли пользователя в компании; не участник или компании нет — []. */
  async rolesOf(companyId: number, user: AuthUser): Promise<string[]> {
    const company = await this.get<CompanyView>(`/companies/${companyId}`, user);
    return company?.roles ?? [];
  }

  /** Участник ли userId компании — глазами actor, который сам в ней (иначе ответ false). */
  async isMember(companyId: number, userId: number, actor: AuthUser): Promise<boolean> {
    const members = await this.get<MemberView[]>(`/companies/${companyId}/members`, actor);
    return members?.some((member) => member.userId === userId) ?? false;
  }

  /** 404 — undefined: невидимая и несуществующая компания для складов одно и то же. */
  private async get<T>(path: string, user: AuthUser): Promise<T | undefined> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'X-User-Id': String(user.id), 'X-User-Role': user.role },
      });
    } catch {
      throw new BadGatewayException('Сервис компаний недоступен');
    }

    if (response.status === 404) return undefined;
    if (response.status === 401) throw new UnauthorizedException();
    if (!response.ok) throw new BadGatewayException(`Сервис компаний ответил ${response.status}`);
    return (await response.json()) as T;
  }
}

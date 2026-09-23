import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

import { type Database, DB } from '~/db/db.module';
import { users } from '~/db/schema';

import { hashPassword } from './password';

export const DEFAULT_ADMIN_ID = 1;

// Админа заводит сам сервис при старте, а не сид: так он появляется одинаково в dev и
// в проде (там запускается собранный dist) и раньше, чем сервер начнёт принимать запросы.
@Injectable()
export class DefaultAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DefaultAdminService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Только создание, никакого upsert: старый сид на каждом запуске перезаписывал
    // пароль значением из env, и сменённый пароль админа не переживал рестарт.
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, DEFAULT_ADMIN_ID));
    if (existing) return;

    const login = (this.config.get<string>('DEFAULT_ADMIN_LOGIN') || 'admin').trim().toLowerCase();
    const envPassword = this.config.get<string>('DEFAULT_ADMIN_PASSWORD');
    const password = envPassword || randomBytes(12).toString('base64url');

    await this.db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: DEFAULT_ADMIN_ID,
        login,
        password: await hashPassword(password),
        firstName: this.config.get<string>('DEFAULT_ADMIN_FIRST_NAME') || 'Администратор',
        role: 'ADMIN',
      });
      // Явный id не двигает последовательность identity: без setval первая же
      // регистрация получила бы id 1 и упала на duplicate key.
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT max(id) FROM users))`,
      );
    });

    if (envPassword) {
      this.logger.log(`Default admin created: id=${DEFAULT_ADMIN_ID}, login "${login}"`);
    } else {
      // Пароль нигде больше не сохраняется — это единственный раз, когда его видно.
      this.logger.warn(
        `Default admin created: id=${DEFAULT_ADMIN_ID}, login "${login}", generated password "${password}". ` +
          'It is shown only once: change it via POST /auth/change-password.',
      );
    }
  }
}

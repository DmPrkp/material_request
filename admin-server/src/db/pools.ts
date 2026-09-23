import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Pool, type QueryResult, types } from 'pg';

/**
 * Все шесть баз проекта. Имена — как их заводит db/init/01-create-databases.sh
 * (calc — из POSTGRES_DB); другой набор на каком-то стенде переопределяется ADMIN_DATABASE_<NAME>.
 * Не ADMIN_DB_<NAME>: для базы user это ADMIN_DB_USER — логин роли, и пул user уезжал в базу
 * с именем логина.
 */
export const DATABASES = ['user', 'company', 'warehouse', 'order', 'dictionary', 'calc'] as const;
export type DbName = (typeof DATABASES)[number];

// Админка только показывает: numeric и bigint строкой не отсортировать и не отфильтровать
// как число, а точность сверх double здесь ни к чему. Парсеры глобальные для pg, но в этом
// процессе других потребителей нет.
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Не задана переменная окружения ${name}`);
  return value;
}

/**
 * По пулу на базу под read-only ролью (db/init/02-admin-readonly.sh): межбазовых JOIN-ов
 * в Postgres нет, поэтому связи между базами собирает код (tables/refs.ts), а не SQL.
 * Пишет админка только через API сервисов — чтобы не обходить их правила.
 */
@Injectable()
export class DbPools implements OnApplicationShutdown {
  private readonly pools = new Map<DbName, Pool>();

  constructor() {
    const host = env('DB_HOST');
    const port = Number(process.env.DB_PORT ?? 5432);
    const user = env('ADMIN_DB_USER');
    const password = env('ADMIN_DB_PASSWORD');

    for (const db of DATABASES) {
      const database = process.env[`ADMIN_DATABASE_${db.toUpperCase()}`] ?? db;
      this.pools.set(db, new Pool({ host, port, user, password, database, max: 3 }));
    }
  }

  query<T extends Record<string, unknown> = Record<string, unknown>>(
    db: DbName,
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pools.get(db)!.query<T>(sql, params);
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([...this.pools.values()].map((pool) => pool.end()));
  }
}

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DATABASES, DbPools } from './pools';

describe('DbPools', () => {
  afterEach(() => vi.unstubAllEnvs());

  // Было: переопределение имени базы звалось ADMIN_DB_<NAME>, и для user это оказался
  // логин роли — пул базы user шёл в базу «test».
  it('логин роли не подменяет имя базы user', async () => {
    vi.stubEnv('DB_HOST', 'localhost');
    vi.stubEnv('ADMIN_DB_USER', 'test');
    vi.stubEnv('ADMIN_DB_PASSWORD', 'secret');

    const pools = new DbPools();
    const byDb = (pools as unknown as { pools: Map<string, { options: { database: string; user: string } }> })
      .pools;

    for (const db of DATABASES) expect(byDb.get(db)?.options).toMatchObject({ database: db, user: 'test' });
    await pools.onApplicationShutdown();
  });
});

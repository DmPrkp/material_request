import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '~/db/db.module';
import type { NewUser } from '~/db/schema';

import { DEFAULT_ADMIN_ID, DefaultAdminService } from './default-admin.service';

/** Ровно те цепочки Drizzle, которыми пользуется сервис: select…where, insert…values, execute. */
function setup(existing: unknown[], env: Record<string, string> = {}) {
  const values = vi.fn<(data: NewUser) => Promise<void>>(() => Promise.resolve());
  const execute = vi.fn(() => Promise.resolve());
  const tx = { insert: vi.fn(() => ({ values })), execute };
  const db = {
    select: vi.fn(() => ({ from: () => ({ where: () => Promise.resolve(existing) }) })),
    transaction: vi.fn((run: (t: typeof tx) => Promise<void>) => run(tx)),
  };
  const service = new DefaultAdminService(db as unknown as Database, new ConfigService(env));
  return { db, values, execute, service };
}

describe('DefaultAdminService', () => {
  it('creates an admin with id 1 and moves the id sequence past it', async () => {
    const { values, execute, service } = setup([], {
      DEFAULT_ADMIN_LOGIN: ' Root ',
      DEFAULT_ADMIN_PASSWORD: 'topsecret',
    });

    await service.onApplicationBootstrap();

    const data = values.mock.calls[0][0];
    expect(data).toMatchObject({ id: DEFAULT_ADMIN_ID, login: 'root', role: 'ADMIN' });
    expect(await compare('topsecret', data.password)).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('leaves an existing user with id 1 untouched', async () => {
    const { db, service } = setup([{ id: DEFAULT_ADMIN_ID }]);

    await service.onApplicationBootstrap();

    expect(db.transaction).not.toHaveBeenCalled();
  });
});

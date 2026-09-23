import { PGlite } from '@electric-sql/pglite';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '~/db/db.module';
import * as schema from '~/db/schema';
import { zaiavki } from '~/db/schema';

import { ZaiavkaService } from './zaiavka.service';

/**
 * Настоящий Postgres в памяти (PGlite) с той же миграцией, что в проде: моки цепочек
 * Drizzle проверяли бы только, что вызваны методы, а не что условия в SQL верные.
 */
describe('ZaiavkaService', () => {
  const author = { id: 7, role: 'USER' as const };
  const admin = { id: 1, role: 'ADMIN' as const };
  const data = { hand_tools: [], materials: [], power_tools: [], system: 'EIFS' };
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');

  let client: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let service: ZaiavkaService;

  beforeAll(async () => {
    client = new PGlite();
    db = drizzle(client, { schema, casing: 'snake_case' });
    await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
    // Сервис типизирован под node-postgres; API запросов у драйверов общий.
    service = new ZaiavkaService(db as unknown as Database);
  });

  afterAll(() => client.close());

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE zaiavki RESTART IDENTITY`);
  });

  const seed = (rows: { id: number; user: number | null; editKeyHash?: string | null; updatedAt?: Date }[]) =>
    db.insert(zaiavki).values(rows.map((row) => ({ data, editKeyHash: null, ...row })));

  const byId = async (id: number) =>
    (
      await db
        .select()
        .from(zaiavki)
        .where(sql`id = ${id}`)
    )[0];

  it('со входом автор — из токена, user из тела игнорируется, ключа нет', async () => {
    const res = await service.create({ ...data, user: 1 }, author);

    expect(res).not.toHaveProperty('key');
    expect(res.user).toBe(7);
    const row = await byId(res.id);
    expect(row.data).toEqual(data);
    expect(row.editKeyHash).toBeNull();
  });

  it('без входа — ничья, ключ в ответе, в базе только его хеш', async () => {
    const res = await service.create(data);

    expect(res.key).toEqual(expect.any(String));
    expect(res).not.toHaveProperty('editKeyHash');
    const row = await byId(res.id);
    expect(row.user).toBeNull();
    expect(row.editKeyHash).toBe(hash(res.key!));
  });

  it('в базе — объект, наружу data — строкой, как ждёт клиент', async () => {
    const res = await service.create(data, author);

    expect(typeof res.data).toBe('string');
    expect(JSON.parse(res.data)).toEqual(data);
    const [{ name }] = (
      await db.execute<{ name: string }>(sql`SELECT jsonb_typeof(data) AS name FROM zaiavki`)
    ).rows;
    expect(name).toBe('object');
  });

  it('правка меняет данные и updated_at, автора не трогает', async () => {
    await seed([{ id: 3, user: 7, updatedAt: new Date('2020-01-01') }]);

    const res = await service.put(3, { ...data, system: 'scaffold', user: 99 }, author);

    expect(JSON.parse(res.data)).toMatchObject({ system: 'scaffold' });
    expect(JSON.parse(res.data)).not.toHaveProperty('user');
    expect(res.user).toBe(7);
    expect(res.updatedAt.getTime()).toBeGreaterThan(new Date('2020-01-01').getTime());
  });

  it('чужую править нельзя — 403, админ — можно', async () => {
    await seed([{ id: 3, user: 8 }]);
    await expect(service.put(3, data, author)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.put(3, data, admin)).resolves.toBeDefined();
  });

  it('ничью правит только тот, у кого ключ', async () => {
    await seed([{ id: 3, user: null, editKeyHash: hash('secret') }]);
    await expect(service.put(3, data, undefined, 'secret')).resolves.toBeDefined();
    await expect(service.put(3, data, undefined, 'wrong')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.put(3, data, author)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ключ не открывает заявку, у которой уже есть автор', async () => {
    await seed([{ id: 3, user: 8, editKeyHash: hash('secret') }]);
    await expect(service.put(3, data, undefined, 'secret')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('удаляет автор, админ и владелец ключа — по тем же правам, что правка', async () => {
    await seed([
      { id: 3, user: 7 },
      { id: 4, user: 8 },
      { id: 5, user: null, editKeyHash: hash('secret') },
    ]);
    await service.remove(3, author);
    await expect(service.remove(4, author)).rejects.toBeInstanceOf(ForbiddenException);
    await service.remove(4, admin);
    await expect(service.remove(5, undefined, 'wrong')).rejects.toBeInstanceOf(ForbiddenException);
    await service.remove(5, undefined, 'secret');
    await expect(service.remove(9, author)).rejects.toBeInstanceOf(NotFoundException);
    expect(await db.select().from(zaiavki)).toEqual([]);
  });

  it('список — только свои, и у админа тоже; по ids — любые, новые сверху', async () => {
    await seed([
      { id: 1, user: 7 },
      { id: 2, user: 8 },
      { id: 3, user: 7 },
      { id: 4, user: null },
    ]);
    expect((await service.getAll(author)).map((z) => z.id)).toEqual([3, 1]);
    expect(await service.getAll(admin)).toEqual([]);
    expect((await service.lookup([4, 2, 99])).map((z) => z.id)).toEqual([4, 2]);
    expect(await service.lookup([])).toEqual([]);
  });

  it('claim забирает только ничьи с верным ключом и снимает ключ', async () => {
    await seed([
      { id: 1, user: null, editKeyHash: hash('a') },
      { id: 2, user: null, editKeyHash: hash('b') },
      { id: 3, user: 8, editKeyHash: null },
    ]);

    const res = await service.claim(author, [
      { id: 1, key: 'a' },
      { id: 2, key: 'wrong' },
      { id: 3, key: 'x' },
    ]);

    expect(res).toEqual({ claimed: [1] });
    expect(await byId(1)).toMatchObject({ user: 7, editKeyHash: null });
    expect(await byId(2)).toMatchObject({ user: null });
    expect(await byId(3)).toMatchObject({ user: 8 });
  });

  it('чистка удаляет только ничьи старше 30 дней', async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await seed([
      { id: 1, user: null, updatedAt: old },
      { id: 2, user: null },
      { id: 3, user: 7, updatedAt: old },
    ]);

    await service.removeStaleAnonymous();

    expect((await db.select({ id: zaiavki.id }).from(zaiavki)).map((r) => r.id).sort()).toEqual([2, 3]);
  });

  it('нет такой — 404', async () => {
    await expect(service.put(3, data, author)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.get(3)).rejects.toBeInstanceOf(NotFoundException);
  });
});

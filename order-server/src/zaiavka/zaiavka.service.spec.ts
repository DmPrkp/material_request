import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ZaiavkaService } from './zaiavka.service';

describe('ZaiavkaService', () => {
  const author = { id: 7, login: 'ivan', role: 'USER' as const };
  const data = { hand_tools: [], materials: [], power_tools: [], system: 'EIFS' };
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');

  type Row = { id: number; user: number | null; editKeyHash: string | null };

  function serviceWith(rows: Row[] = []) {
    const prisma = {
      zaiavka: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 1, ...data })),
        update: jest.fn(({ where, data }) => Promise.resolve({ ...rows.find((r) => r.id === where.id), ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn(({ where }) =>
          Promise.resolve(
            rows.filter((r) => (where.id?.in ? where.id.in.includes(r.id) : true) && (where.user === undefined || r.user === where.user)),
          ),
        ),
        findUnique: jest.fn(({ where }) => Promise.resolve(rows.find((r) => r.id === where.id) ?? null)),
      },
    };
    return { service: new ZaiavkaService(prisma as never), prisma };
  }

  it('со входом автор — из токена, user из тела игнорируется, ключа нет', async () => {
    const { service, prisma } = serviceWith();
    const res = await service.create({ ...data, user: 1 }, author);
    const arg = prisma.zaiavka.create.mock.calls[0][0];
    expect(arg.data.user).toBe(7);
    expect(JSON.parse(arg.data.data)).toEqual(data);
    expect(res).not.toHaveProperty('key');
  });

  it('без входа — ничья, ключ в ответе, в базе только его хеш', async () => {
    const { service, prisma } = serviceWith();
    const res = await service.create(data);
    const arg = prisma.zaiavka.create.mock.calls[0][0];
    expect(arg.data.user).toBeNull();
    expect(arg.data.editKeyHash).toBe(hash(res.key));
    expect(res).not.toHaveProperty('editKeyHash');
  });

  it('список — только свои', async () => {
    const { service, prisma } = serviceWith();
    await service.getAll(author);
    expect(prisma.zaiavka.findMany.mock.calls[0][0].where).toEqual({ user: 7 });
  });

  it('правка своей сохраняет system и не отдаёт хеш', async () => {
    const { service, prisma } = serviceWith([{ id: 3, user: 7, editKeyHash: null }]);
    const res = await service.put(3, data, author);
    expect(JSON.parse(prisma.zaiavka.update.mock.calls[0][0].data.data).system).toBe('EIFS');
    expect(res).not.toHaveProperty('editKeyHash');
  });

  it('чужую править нельзя — 403, админ — можно', async () => {
    const { service } = serviceWith([{ id: 3, user: 8, editKeyHash: null }]);
    await expect(service.put(3, data, author)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.put(3, data, { ...author, role: 'ADMIN' })).resolves.toBeDefined();
  });

  it('ничью правит только тот, у кого ключ', async () => {
    const { service } = serviceWith([{ id: 3, user: null, editKeyHash: hash('secret') }]);
    await expect(service.put(3, data, undefined, 'secret')).resolves.toBeDefined();
    await expect(service.put(3, data, undefined, 'wrong')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.put(3, data, author)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ключ не открывает заявку, у которой уже есть автор', async () => {
    const { service } = serviceWith([{ id: 3, user: 8, editKeyHash: hash('secret') }]);
    await expect(service.put(3, data, undefined, 'secret')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('claim забирает только ничьи с верным ключом', async () => {
    const { service, prisma } = serviceWith([
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
    expect(prisma.zaiavka.updateMany.mock.calls[0][0]).toEqual({
      where: { id: { in: [1] }, user: null },
      data: { user: 7, editKeyHash: null },
    });
  });

  it('чистка трогает только ничьи старше 30 дней', async () => {
    const { service, prisma } = serviceWith();
    await service.removeStaleAnonymous();
    const where = prisma.zaiavka.deleteMany.mock.calls[0][0].where;
    expect(where.user).toBeNull();
    expect(Date.now() - where.updatedAt.lt.getTime()).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000);
  });

  it('нет такой — 404', async () => {
    const { service } = serviceWith();
    await expect(service.put(3, data, author)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.get(3)).rejects.toBeInstanceOf(NotFoundException);
  });
});

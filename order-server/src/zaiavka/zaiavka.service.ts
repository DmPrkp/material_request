import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { Zaiavka } from '@prisma/client';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateZaiavkaDto } from '../types';
import type { AuthUser } from '../auth/auth-user';

/**
 * Ничьи заявки заводит каждое открытие расчёта без входа — большинство так никто и не
 * заберёт. Живут 30 дней с последней правки: этого хватает, чтобы вернуться и войти.
 */
const ANONYMOUS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Больше в браузере не накопится разумным путём; не даём одним запросом выгрести базу. */
const MAX_LOOKUP_IDS = 200;

export type PublicZaiavka = Omit<Zaiavka, 'editKeyHash'>;

/** Хеш ключа наружу не отдаём никогда — ни автору, ни по ссылке. */
function toPublic(zaiavka: Zaiavka): PublicZaiavka {
  const result: Partial<Zaiavka> = { ...zaiavka };
  delete result.editKeyHash;
  return result as PublicZaiavka;
}

/** Ключ случайный, 192 бита — перебор не грозит, поэтому хватает sha256 без соли. */
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function keyMatches(zaiavka: Zaiavka, key: string | undefined): boolean {
  if (!key || !zaiavka.editKeyHash) return false;
  const expected = Buffer.from(zaiavka.editKeyHash, 'hex');
  const actual = Buffer.from(hashKey(key), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

@Injectable()
export class ZaiavkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ZaiavkaService.name);
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    void this.removeStaleAnonymous();
    this.cleanupTimer = setInterval(() => void this.removeStaleAnonymous(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  async removeStaleAnonymous() {
    try {
      const { count } = await this.prisma.zaiavka.deleteMany({
        where: { user: null, updatedAt: { lt: new Date(Date.now() - ANONYMOUS_TTL_MS) } },
      });
      if (count) this.logger.log(`Удалено ничьих заявок старше 30 дней: ${count}`);
    } catch (error) {
      this.logger.error('Не удалось почистить ничьи заявки', error);
    }
  }

  /**
   * Автор — только из токена: user из тела подделал бы кто угодно. Без входа заявка
   * ничья, и ответ несёт ключ правки — единственный раз, когда он виден.
   */
  async create(createZaiavkaDto: CreateZaiavkaDto, author?: AuthUser): Promise<PublicZaiavka & { key?: string }> {
    const data = JSON.stringify(withoutUser(createZaiavkaDto));

    if (author) {
      return toPublic(await this.prisma.zaiavka.create({ data: { user: author.id, data } }));
    }

    const key = randomBytes(24).toString('base64url');
    const created = await this.prisma.zaiavka.create({ data: { user: null, editKeyHash: hashKey(key), data } });
    return { ...toPublic(created), key };
  }

  /**
   * Свою правит автор, любую — админ, ничью — тот, у кого ключ. Клиент шлёт заявку
   * целиком, вместе с system: раньше он здесь вырезался, и выгрузка теряла технологию.
   */
  async put(id: number, createZaiavkaDto: CreateZaiavkaDto, author?: AuthUser, key?: string) {
    await this.findWritable(id, author, key);

    const updated = await this.prisma.zaiavka.update({
      where: { id },
      data: { data: JSON.stringify(withoutUser(createZaiavkaDto)) },
    });
    return toPublic(updated);
  }

  /** Удаление — по тем же правам, что правка: своя, любая для админа, ничья по ключу. */
  async remove(id: number, author?: AuthUser, key?: string) {
    await this.findWritable(id, author, key);
    await this.prisma.zaiavka.delete({ where: { id } });
  }

  /** Свою правит автор, любую — админ, ничью — тот, у кого ключ; иначе 403, нет такой — 404. */
  private async findWritable(id: number, author?: AuthUser, key?: string) {
    const existing = await this.prisma.zaiavka.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();

    const allowed =
      (author && (existing.user === author.id || author.role === 'ADMIN')) ||
      (existing.user === null && keyMatches(existing, key));
    if (!allowed) throw new ForbiddenException();
    return existing;
  }

  /** Только свои — и у админа тоже: список это «мои заявки», а не обзор чужих. */
  async getAll(author: AuthUser) {
    const rows = await this.prisma.zaiavka.findMany({
      where: { user: author.id },
      orderBy: { id: 'desc' },
    });
    return rows.map(toPublic);
  }

  /**
   * Список без входа: браузер помнит id своих ничьих заявок. Открыто, как и GET /:id, —
   * по id заявку и так откроет любой, у кого ссылка. Удалённых чисткой просто нет в ответе.
   */
  async lookup(ids: number[]) {
    if (ids.length > MAX_LOOKUP_IDS) throw new BadRequestException(`не больше ${MAX_LOOKUP_IDS} id`);
    const rows = await this.prisma.zaiavka.findMany({
      where: { id: { in: ids } },
      orderBy: { id: 'desc' },
    });
    return rows.map(toPublic);
  }

  /**
   * Вошёл — забирает свои ничьи заявки. Ключ проверяем у каждой: чужую ничью по одному
   * id не присвоить. Отвечаем id тех, что стали его; остальные (удалены чисткой, уже
   * чьи-то) клиенту помнить больше незачем.
   */
  async claim(author: AuthUser, items: { id: number; key: string }[]) {
    if (items.length > MAX_LOOKUP_IDS) throw new BadRequestException(`не больше ${MAX_LOOKUP_IDS} заявок`);

    const rows = await this.prisma.zaiavka.findMany({
      where: { id: { in: items.map((item) => item.id) }, user: null },
    });
    const claimable = rows.filter((row) => keyMatches(row, items.find((item) => item.id === row.id)?.key));
    if (!claimable.length) return { claimed: [] };

    // user: null в условии — две вкладки не заберут одну заявку дважды.
    await this.prisma.zaiavka.updateMany({
      where: { id: { in: claimable.map((row) => row.id) }, user: null },
      data: { user: author.id, editKeyHash: null },
    });
    return { claimed: claimable.map((row) => row.id) };
  }

  async get(id: number) {
    const zaiavka = await this.prisma.zaiavka.findUnique({ where: { id } });
    if (!zaiavka) throw new NotFoundException();
    return toPublic(zaiavka);
  }
}

function withoutUser(dto: CreateZaiavkaDto): Omit<CreateZaiavkaDto, 'user'> {
  const data = { ...dto };
  delete data.user;
  return data;
}

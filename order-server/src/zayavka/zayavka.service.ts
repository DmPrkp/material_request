import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type { AuthUser } from '~/auth/auth-user';
import { type Database, DB } from '~/db/db.module';
import { type Zayavka, zayavki } from '~/db/schema';

import { MAX_LOOKUP_IDS } from './limits';

/**
 * Ничьи заявки заводит каждое открытие расчёта без входа — большинство так никто и не
 * заберёт. Живут 30 дней с последней правки: этого хватает, чтобы вернуться и войти.
 */
const ANONYMOUS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type ZayavkaBody = Record<string, unknown>;

/**
 * Что уходит наружу. data — строкой, как отдавал сервис при Prisma (там в jsonb лежала
 * строка): клиент и сиды делают JSON.parse. В базе теперь объект, строкой он становится
 * только здесь. Поля перечислены явно — хеш ключа не уйдёт наружу, даже если его забудут.
 */
export type PublicZayavka = {
  id: number;
  data: string;
  user: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function toPublic(row: Zayavka): PublicZayavka {
  return {
    id: row.id,
    data: JSON.stringify(row.data),
    user: row.user,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Ключ случайный, 192 бита — перебор не грозит, поэтому хватает sha256 без соли. */
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function keyMatches(zayavka: Pick<Zayavka, 'editKeyHash'>, key: string | undefined): boolean {
  if (!key || !zayavka.editKeyHash) return false;
  const expected = Buffer.from(zayavka.editKeyHash, 'hex');
  const actual = Buffer.from(hashKey(key), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Автор — только из токена: user из тела подделал бы кто угодно. */
function withoutUser(body: ZayavkaBody): ZayavkaBody {
  const data = { ...body };
  delete data.user;
  return data;
}

@Injectable()
export class ZayavkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ZayavkaService.name);
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(@Inject(DB) private readonly db: Database) {}

  onModuleInit(): void {
    void this.removeStaleAnonymous();
    this.cleanupTimer = setInterval(() => void this.removeStaleAnonymous(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  async removeStaleAnonymous(): Promise<void> {
    try {
      const removed = await this.db
        .delete(zayavki)
        .where(and(isNull(zayavki.user), lt(zayavki.updatedAt, new Date(Date.now() - ANONYMOUS_TTL_MS))))
        .returning({ id: zayavki.id });
      if (removed.length) this.logger.log(`Удалено ничьих заявок старше 30 дней: ${removed.length}`);
    } catch (error) {
      this.logger.error('Не удалось почистить ничьи заявки', error);
    }
  }

  /** Без входа заявка ничья, и ответ несёт ключ правки — единственный раз, когда он виден. */
  async create(body: ZayavkaBody, author?: AuthUser): Promise<PublicZayavka & { key?: string }> {
    const data = withoutUser(body);

    if (author) {
      const [created] = await this.db.insert(zayavki).values({ user: author.id, data }).returning();
      return toPublic(created);
    }

    const key = randomBytes(24).toString('base64url');
    const [created] = await this.db
      .insert(zayavki)
      .values({ user: null, editKeyHash: hashKey(key), data })
      .returning();
    return { ...toPublic(created), key };
  }

  /**
   * Свою правит автор, любую — админ, ничью — тот, у кого ключ. Клиент шлёт заявку
   * целиком, вместе с system: раньше он здесь вырезался, и выгрузка теряла технологию.
   */
  async put(id: number, body: ZayavkaBody, author?: AuthUser, key?: string): Promise<PublicZayavka> {
    await this.findWritable(id, author, key);
    const [updated] = await this.db
      .update(zayavki)
      .set({ data: withoutUser(body) })
      .where(eq(zayavki.id, id))
      .returning();
    return toPublic(updated);
  }

  /** Удаление — по тем же правам, что правка: своя, любая для админа, ничья по ключу. */
  async remove(id: number, author?: AuthUser, key?: string): Promise<void> {
    await this.findWritable(id, author, key);
    await this.db.delete(zayavki).where(eq(zayavki.id, id));
  }

  /** Свою правит автор, любую — админ, ничью — тот, у кого ключ; иначе 403, нет такой — 404. */
  private async findWritable(id: number, author?: AuthUser, key?: string): Promise<Zayavka> {
    const [existing] = await this.db.select().from(zayavki).where(eq(zayavki.id, id));
    if (!existing) throw new NotFoundException();

    const allowed =
      (author && (existing.user === author.id || author.role === 'ADMIN')) ||
      (existing.user === null && keyMatches(existing, key));
    if (!allowed) throw new ForbiddenException();
    return existing;
  }

  /** Только свои — и у админа тоже: список это «мои заявки», а не обзор чужих. */
  async getAll(author: AuthUser): Promise<PublicZayavka[]> {
    const rows = await this.db
      .select()
      .from(zayavki)
      .where(eq(zayavki.user, author.id))
      .orderBy(desc(zayavki.id));
    return rows.map(toPublic);
  }

  /**
   * Список без входа: браузер помнит id своих ничьих заявок. Открыто, как и GET /:id, —
   * по id заявку и так откроет любой, у кого ссылка. Удалённых чисткой просто нет в ответе.
   */
  async lookup(ids: number[]): Promise<PublicZayavka[]> {
    if (ids.length > MAX_LOOKUP_IDS) throw new BadRequestException(`не больше ${MAX_LOOKUP_IDS} id`);
    if (!ids.length) return [];
    const rows = await this.db
      .select()
      .from(zayavki)
      .where(inArray(zayavki.id, ids))
      .orderBy(desc(zayavki.id));
    return rows.map(toPublic);
  }

  /**
   * Вошёл — забирает свои ничьи заявки. Ключ проверяем у каждой: чужую ничью по одному
   * id не присвоить. Отвечаем id тех, что стали его; остальные (удалены чисткой, уже
   * чьи-то) клиенту помнить больше незачем.
   */
  async claim(author: AuthUser, items: { id: number; key: string }[]): Promise<{ claimed: number[] }> {
    if (!items.length) return { claimed: [] };

    const ids = items.map((item) => item.id);
    const rows = await this.db
      .select({ id: zayavki.id, editKeyHash: zayavki.editKeyHash })
      .from(zayavki)
      .where(and(inArray(zayavki.id, ids), isNull(zayavki.user)));
    const claimable = rows.filter((row) => keyMatches(row, items.find((item) => item.id === row.id)?.key));
    if (!claimable.length) return { claimed: [] };

    // user IS NULL в условии — две вкладки не заберут одну заявку дважды.
    const claimableIds = claimable.map((row) => row.id);
    const claimed = await this.db
      .update(zayavki)
      .set({ user: author.id, editKeyHash: null })
      .where(and(inArray(zayavki.id, claimableIds), isNull(zayavki.user)))
      .returning({ id: zayavki.id });
    return { claimed: claimed.map((row) => row.id) };
  }

  async get(id: number): Promise<PublicZayavka> {
    const [row] = await this.db.select().from(zayavki).where(eq(zayavki.id, id));
    if (!row) throw new NotFoundException();
    return toPublic(row);
  }
}

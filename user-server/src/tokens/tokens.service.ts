import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';

import { type Database, DB } from '~/db/db.module';
import { type TokenType, type UserToken, userTokens } from '~/db/schema';

/**
 * Сколько живёт ссылка. У сброса короче: письмо про пароль опаснее — им пользуются,
 * когда до ящика уже добрались чужие.
 */
export const TTL_HOURS: Record<TokenType, number> = { verify: 24, reset: 2 };

/** В базе только хеш: по дампу ссылку не собрать. Как ключ ничьей заявки в order-server. */
const hash = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class TokensService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Выпускает ссылку. Сырое значение возвращается один раз — уходит в письмо и нигде
   * не сохраняется. Прежние живые ссылки той же цели гасим: выпустил новую — старая
   * перестаёт работать, иначе у человека на руках несколько действующих.
   */
  async issue(userId: number, type: TokenType, email: string): Promise<{ token: string; hours: number }> {
    await this.db
      .update(userTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(userTokens.userId, userId), eq(userTokens.type, type), isNull(userTokens.usedAt)));

    const token = randomBytes(32).toString('base64url');
    const hours = TTL_HOURS[type];

    await this.db.insert(userTokens).values({
      userId,
      type,
      email,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    });

    return { token, hours };
  }

  /**
   * Гасит ссылку и возвращает её запись, если она ещё была жива. Гашение — тем же
   * UPDATE с проверкой used_at, а не отдельным запросом после SELECT: два клика по
   * ссылке приходят одновременно, и между SELECT и UPDATE второй успевал проскочить.
   */
  async consume(token: string, type: TokenType): Promise<UserToken | undefined> {
    const [used] = await this.db
      .update(userTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(userTokens.tokenHash, hash(token)),
          eq(userTokens.type, type),
          isNull(userTokens.usedAt),
        ),
      )
      .returning();

    // Протухшую гасим тоже — второй раз её проверять незачем.
    if (!used || used.expiresAt.getTime() <= Date.now()) return undefined;
    return used;
  }
}

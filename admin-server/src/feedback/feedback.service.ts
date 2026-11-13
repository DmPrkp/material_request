import { Injectable } from '@nestjs/common';

import { DbPools } from '~/db/pools';

export type FeedbackEntry = {
  id: number;
  topic: 'bug' | 'idea';
  message: string;
  createdAt: string;
  user: {
    id: number;
    login: string;
    name: string;
    /** Пусто — ответить человеку некуда: почта необязательна. */
    email: string | null;
    emailVerified: boolean;
  };
};

/** Больше за раз не показываем: обращения читают свежими, а не листают с начала времён. */
const LIMIT = 300;

@Injectable()
export class FeedbackService {
  constructor(private readonly pools: DbPools) {}

  /**
   * Обращения с автором одним запросом: и то и другое лежит в базе `user`, так что это
   * обычный JOIN — запрет на межбазовые касается разных баз, а не соседних таблиц.
   *
   * Читаем напрямую под read-only ролью, как остальные разделы админки: ручки чтения
   * в user-server нет и заводить её незачем — наружу обращения не показываются.
   */
  async list(): Promise<{ items: FeedbackEntry[]; total: number; limit: number }> {
    const [rows, totals] = await Promise.all([
      this.pools.query<{
        id: number;
        topic: 'bug' | 'idea';
        message: string;
        created_at: Date;
        user_id: number;
        login: string;
        first_name: string;
        last_name: string | null;
        email: string | null;
        email_verified_at: Date | null;
      }>(
        'user',
        `SELECT f.id, f.topic, f.message, f.created_at,
                u.id AS user_id, u.login, u.first_name, u.last_name, u.email, u.email_verified_at
           FROM feedback f
           JOIN users u ON u.id = f.user_id
          ORDER BY f.created_at DESC
          LIMIT $1`,
        [LIMIT],
      ),
      this.pools.query<{ count: string }>('user', 'SELECT count(*)::text AS count FROM feedback'),
    ]);

    return {
      items: rows.rows.map((row) => ({
        id: row.id,
        topic: row.topic,
        message: row.message,
        createdAt: row.created_at.toISOString(),
        user: {
          id: row.user_id,
          login: row.login,
          name: [row.first_name, row.last_name].filter(Boolean).join(' '),
          email: row.email,
          emailVerified: row.email_verified_at !== null,
        },
      })),
      total: Number(totals.rows[0]?.count ?? 0),
      limit: LIMIT,
    };
  }
}

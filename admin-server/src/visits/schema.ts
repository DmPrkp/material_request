import {
  bigint,
  boolean,
  index,
  inet,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * База stats — единственная, куда admin-server пишет сам (остальные он только читает, а
 * пишет через API сервисов). Это его собственные данные: кто ходил на сайт, по access-логу
 * nginx (logs/visits.jsonl). Миграции — drizzle/ этого пакета, накатываются на старте.
 */

/**
 * Посетитель — один IP. visits — «заходы»: запросы, между которыми меньше 15 минут, — один
 * заход, пауза дольше — новый (visits.store.ts). last_seen двигается на каждом запросе, так что
 * 15 минут считаются от последнего запроса, а не от начала захода: человек, кликающий по
 * сайту час без перерывов, — один заход.
 */
export const visitors = pgTable(
  'visitors',
  {
    ip: inet('ip').primaryKey(),
    firstSeen: timestamp('first_seen', { withTimezone: true }).notNull(),
    lastSeen: timestamp('last_seen', { withTimezone: true }).notNull(),
    visits: integer('visits').notNull(),
    /** По User-Agent последнего запроса (bots.ts): один IP за NAT бывает и тем, и другим. */
    isBot: boolean('is_bot').notNull(),
    userAgent: text('user_agent'),
    lastPath: varchar('last_path', { length: 500 }),
  },
  (t) => [index('visitors_last_seen_idx').on(t.lastSeen)],
);

/**
 * Докуда дочитан visits.jsonl: после рестарта продолжаем с места, а не считаем заново.
 * fileId — устройство:inode; сменился (файл пересоздали) или файл стал короче позиции
 * (усекли) — читаем сначала. Строка одна (id = 1), позиция пишется той же транзакцией,
 * что и посетители, — иначе падение между ними посчитало бы кусок дважды.
 */
export const visitsCursor = pgTable('visits_cursor', {
  id: smallint('id').primaryKey(),
  fileId: varchar('file_id', { length: 64 }).notNull(),
  offset: bigint('offset', { mode: 'number' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

import type { VisitorBatch } from './hits';

/** pg.Pool, pg.PoolClient и PGlite (тесты) — у всех query(sql, params) → { rows }. */
export type Queryable = { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

export type Cursor = { fileId: string; offset: number };

/**
 * Upsert пачки одним запросом. Счёт заходов делит работу с foldHits: внутри пачки паузы
 * посчитаны в коде (innerVisits), а продолжается ли первый запрос пачки прежний заход —
 * видно только по last_seen в базе, это решает CASE. Без кеша в памяти: после рестарта
 * правило 15 минут продолжает работать от того, что лежит в базе.
 *
 * GREATEST у last_seen — страховка от строк не по порядку (два воркера nginx пишут вперемешку
 * в пределах секунды): last_seen не уедет назад.
 */
const UPSERT = `
  INSERT INTO visitors (ip, first_seen, last_seen, visits, is_bot, user_agent, last_path)
  SELECT b.ip, b.first_at, b.last_at, b.inner_visits + 1, b.is_bot, b.ua, b.path
  FROM jsonb_to_recordset($1::jsonb) AS b(
    ip inet, first_at timestamptz, last_at timestamptz, inner_visits int, is_bot boolean, ua text, path text
  )
  ON CONFLICT (ip) DO UPDATE SET
    visits = visitors.visits + EXCLUDED.visits - 1
      + CASE WHEN EXCLUDED.first_seen - visitors.last_seen > interval '15 minutes' THEN 1 ELSE 0 END,
    last_seen = GREATEST(visitors.last_seen, EXCLUDED.last_seen),
    is_bot = EXCLUDED.is_bot,
    user_agent = EXCLUDED.user_agent,
    last_path = EXCLUDED.last_path`;

export async function upsertVisitors(db: Queryable, batch: VisitorBatch[]): Promise<void> {
  if (!batch.length) return;
  // Пачкой через jsonb_to_recordset: один запрос на сотни IP вместо сотни запросов.
  const rows = batch.map((b) => ({
    ip: b.ip,
    first_at: b.firstAt.toISOString(),
    last_at: b.lastAt.toISOString(),
    inner_visits: b.innerVisits,
    is_bot: b.isBot,
    ua: b.ua,
    path: b.path,
  }));
  await db.query(UPSERT, [JSON.stringify(rows)]);
}

export async function readCursor(db: Queryable): Promise<Cursor | undefined> {
  const { rows } = await db.query('SELECT file_id, "offset" FROM visits_cursor WHERE id = 1');
  const row = rows[0] as { file_id: string; offset: string | number } | undefined;
  return row ? { fileId: row.file_id, offset: Number(row.offset) } : undefined;
}

export async function writeCursor(db: Queryable, cursor: Cursor): Promise<void> {
  await db.query(
    `INSERT INTO visits_cursor (id, file_id, "offset", updated_at) VALUES (1, $1, $2, now())
     ON CONFLICT (id) DO UPDATE SET file_id = EXCLUDED.file_id, "offset" = EXCLUDED."offset", updated_at = now()`,
    [cursor.fileId, cursor.offset],
  );
}

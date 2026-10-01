import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { foldHits, type Hit, isBot, parseHit } from './hits';
import { readCursor, upsertVisitors, writeCursor } from './visits.store';

const BROWSER =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const t = (iso: string) => new Date(iso);
const hit = (ip: string, at: string, ua = BROWSER, path = '/ru/main'): Hit => ({ ip, at: t(at), ua, path });

describe('строка лога и роботы', () => {
  it('разбирает строку формата visits из nginx, мусор пропускает', () => {
    const line =
      '{"t":"2026-10-01T10:00:00+00:00","ip":"91.1.2.3","ua":"curl/8.4.0","u":"/robots.txt","s":"200"}';
    expect(parseHit(line)).toEqual({
      at: t('2026-10-01T10:00:00Z'),
      ip: '91.1.2.3',
      ua: 'curl/8.4.0',
      path: '/robots.txt',
    });
    expect(parseHit('{"t":"2026-10-01T10:00:00+00:00","ua":"x"}')).toBeUndefined();
    expect(parseHit('{"t":"2026-10-01T1')).toBeUndefined();
  });

  it('робот — по подписи, библиотеке, пустому UA и robots.txt', () => {
    expect(isBot({ ua: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)', path: '/' })).toBe(
      true,
    );
    expect(isBot({ ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)', path: '/' })).toBe(true);
    expect(isBot({ ua: 'python-requests/2.31', path: '/' })).toBe(true);
    expect(isBot({ ua: '', path: '/' })).toBe(true);
    expect(isBot({ ua: BROWSER, path: '/robots.txt' })).toBe(true);
    expect(isBot({ ua: BROWSER, path: '/ru/main' })).toBe(false);
    // YaBrowser — браузер, а не YandexBot.
    expect(isBot({ ua: `${BROWSER} YaBrowser/25.2.0`, path: '/' })).toBe(false);
  });

  it('внутри пачки: паузы до 15 минут — один заход, дольше — новый', () => {
    const [batch] = foldHits([
      hit('1.1.1.1', '2026-10-01T10:00:00Z'),
      hit('1.1.1.1', '2026-10-01T10:05:00Z'), // через 5 минут — тот же заход
      hit('1.1.1.1', '2026-10-01T10:40:00Z'), // через 35 — новый
      hit('1.1.1.1', '2026-10-01T10:50:00Z', 'curl/8', '/x'), // последний решает робот ли и UA
    ]);
    expect(batch).toMatchObject({
      ip: '1.1.1.1',
      firstAt: t('2026-10-01T10:00:00Z'),
      lastAt: t('2026-10-01T10:50:00Z'),
      innerVisits: 1,
      isBot: true,
      ua: 'curl/8',
      path: '/x',
    });
  });
});

/** Настоящий Postgres в памяти с той же миграцией, что накатывается на старте. */
describe('запись в базу', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    const dir = join(process.cwd(), 'drizzle');
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      await db.exec(readFileSync(join(dir, file), 'utf8').replaceAll('--> statement-breakpoint', ''));
    }
  });
  afterAll(() => db.close());
  beforeEach(() => db.exec('TRUNCATE visitors, visits_cursor'));

  const visitor = async (ip: string) =>
    (
      await db.query<{ visits: number; last_seen: Date; first_seen: Date; is_bot: boolean }>(
        'SELECT visits, last_seen, first_seen, is_bot FROM visitors WHERE ip = $1',
        [ip],
      )
    ).rows[0];

  it('новый IP — один заход; через 5 минут — тот же; через полчаса и через день — +1', async () => {
    const ip = '91.1.2.3';
    await upsertVisitors(db, foldHits([hit(ip, '2026-10-01T10:00:00Z')]));
    expect(await visitor(ip)).toMatchObject({ visits: 1 });

    await upsertVisitors(db, foldHits([hit(ip, '2026-10-01T10:05:00Z')]));
    expect(await visitor(ip)).toMatchObject({ visits: 1, last_seen: t('2026-10-01T10:05:00Z') });

    await upsertVisitors(db, foldHits([hit(ip, '2026-10-01T10:35:00Z')]));
    await upsertVisitors(db, foldHits([hit(ip, '2026-10-02T09:00:00Z')]));
    expect(await visitor(ip)).toMatchObject({
      visits: 3,
      first_seen: t('2026-10-01T10:00:00Z'),
      last_seen: t('2026-10-02T09:00:00Z'),
    });
  });

  it('15 минут считаются от последнего запроса: час кликов без пауз — один заход', async () => {
    const ip = '91.1.2.4';
    for (let minute = 0; minute <= 60; minute += 10) {
      const at = new Date(Date.UTC(2026, 9, 1, 10, minute)).toISOString();
      await upsertVisitors(db, foldHits([hit(ip, at)]));
    }
    expect(await visitor(ip)).toMatchObject({ visits: 1 });
  });

  it('пачка с несколькими IP и заходами внутри — одним запросом', async () => {
    await upsertVisitors(db, foldHits([hit('91.1.2.5', '2026-10-01T09:00:00Z')]));
    await upsertVisitors(
      db,
      foldHits([
        hit('91.1.2.5', '2026-10-01T09:10:00Z'), // продолжение прежнего захода
        hit('91.1.2.5', '2026-10-01T12:00:00Z'), // новый
        hit('2a02:6b8::1', '2026-10-01T12:00:00Z', 'YandexBot/3.0'),
      ]),
    );
    expect(await visitor('91.1.2.5')).toMatchObject({ visits: 2 });
    expect(await visitor('2a02:6b8::1')).toMatchObject({ visits: 1, is_bot: true });
  });

  it('строка не по порядку не отодвигает last_seen назад', async () => {
    const ip = '91.1.2.6';
    await upsertVisitors(db, foldHits([hit(ip, '2026-10-01T10:00:10Z')]));
    await upsertVisitors(db, foldHits([hit(ip, '2026-10-01T10:00:09Z')]));
    expect(await visitor(ip)).toMatchObject({ visits: 1, last_seen: t('2026-10-01T10:00:10Z') });
  });

  it('позиция в файле переживает рестарт', async () => {
    expect(await readCursor(db)).toBeUndefined();
    await writeCursor(db, { fileId: '66:123', offset: 100 });
    await writeCursor(db, { fileId: '66:123', offset: 250 });
    expect(await readCursor(db)).toEqual({ fileId: '66:123', offset: 250 });
  });
});

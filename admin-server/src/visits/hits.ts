/**
 * Строка visits.jsonl — её пишет nginx форматом `visits` (nginx/main.conf), escape=json:
 * {"t":"2026-10-01T10:00:00+00:00","ip":"1.2.3.4","ua":"Mozilla/…","u":"/ru/main","s":"200"}
 */
export type Hit = { at: Date; ip: string; ua: string; path: string };

export function parseHit(line: string): Hit | undefined {
  try {
    const raw = JSON.parse(line) as { t?: unknown; ip?: unknown; ua?: unknown; u?: unknown };
    const at = new Date(String(raw.t));
    if (typeof raw.ip !== 'string' || !raw.ip || Number.isNaN(at.getTime())) return undefined;
    return {
      at,
      ip: raw.ip,
      ua: typeof raw.ua === 'string' ? raw.ua : '',
      path: typeof raw.u === 'string' ? raw.u : '',
    };
  } catch {
    // Обрывок строки или мусор — пропускаем, статистика не стоит падения.
    return undefined;
  }
}

/**
 * Роботы — по User-Agent: поисковики и сервисы подписываются (Googlebot, YandexBot, AhrefsBot),
 * скрипты выдают себя библиотекой (curl, python-requests), пустой UA браузер не шлёт.
 * Плюс robots.txt и sitemap: человек их не открывает. Это эвристика, а не защита —
 * притворяющийся браузером робот сюда не попадёт, и это нормально для статистики.
 */
const BOT_UA =
  /bot\b|bot\/|crawl|spider|slurp|bingpreview|facebookexternalhit|mediapartners|headless|lighthouse|python|curl|wget|go-http|okhttp|java\/|libwww|httpclient|axios|node-fetch|scrapy|monitor|uptime|preview|scan|ahrefs|semrush|mj12|petal|gptbot|claude|perplexity|bytespider/i;
const BOT_PATHS = new Set(['/robots.txt', '/sitemap.xml', '/sitemap-pages.xml', '/sitemap-technologies.xml']);

export function isBot(hit: Pick<Hit, 'ua' | 'path'>): boolean {
  return !hit.ua.trim() || BOT_UA.test(hit.ua) || BOT_PATHS.has(hit.path);
}

/** Пауза дольше этой — новый заход. */
export const VISIT_GAP_MS = 15 * 60 * 1000;

/** Сводка пачки по одному IP — то, что уходит в базу одной строкой upsert-а. */
export type VisitorBatch = {
  ip: string;
  firstAt: Date;
  lastAt: Date;
  /** Новых заходов внутри пачки, не считая первого запроса (его сверяет с базой SQL). */
  innerVisits: number;
  isBot: boolean;
  ua: string;
  path: string;
};

/**
 * Свернуть запросы пачки по IP. Первый запрос IP в пачке — новый заход или продолжение
 * прежнего, смотря по last_seen в базе, — это решает SQL (visits.store.ts), здесь только
 * паузы между запросами самой пачки.
 */
export function foldHits(hits: Hit[]): VisitorBatch[] {
  const byIp = new Map<string, Hit[]>();
  for (const hit of hits) {
    const list = byIp.get(hit.ip);
    if (list) list.push(hit);
    else byIp.set(hit.ip, [hit]);
  }
  return [...byIp.entries()].map(([ip, list]) => {
    list.sort((a, b) => a.at.getTime() - b.at.getTime());
    let innerVisits = 0;
    for (let i = 1; i < list.length; i++) {
      if (list[i].at.getTime() - list[i - 1].at.getTime() > VISIT_GAP_MS) innerVisits++;
    }
    const last = list[list.length - 1];
    return {
      ip,
      firstAt: list[0].at,
      lastAt: last.at,
      innerVisits,
      isBot: isBot(last),
      ua: last.ua.slice(0, 1000),
      path: last.path.slice(0, 500),
    };
  });
}

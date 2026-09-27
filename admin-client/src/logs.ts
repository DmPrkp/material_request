import type { LogEntry } from './api';

/** Строка таблицы лога: одна запись или группа одинаковых (тогда count > 1 и first/last). */
export type LogRow = LogEntry & { count: number; firstAt: string; entries: LogEntry[] };

/**
 * «Одинаковые» — тот же сервис, то же место и то же сообщение. Числа в пути заменяем:
 * GET /zayavka/5 и GET /zayavka/7 — одна поломка, а не две. У сообщения — только первая
 * строка: хвост у Postgres бывает разным при одной и той же причине.
 */
export function groupKey(entry: LogEntry): string {
  const context = entry.context.replace(/\/\d+(?=\/|\?|$)/g, '/:id').replace(/\?.*$/, '');
  const message = entry.message.split('\n')[0].replace(/\d{2,}/g, 'N');
  return `${entry.service}|${context}|${message}`;
}

export function asRows(entries: LogEntry[]): LogRow[] {
  return entries.map((entry) => ({ ...entry, count: 1, firstAt: entry.at, entries: [entry] }));
}

/** Записи приходят новыми сверху — первая в группе и есть последняя по времени. */
export function grouped(entries: LogEntry[]): LogRow[] {
  const groups = new Map<string, LogRow>();
  for (const entry of entries) {
    const key = groupKey(entry);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { ...entry, count: 1, firstAt: entry.at, entries: [entry] });
      continue;
    }
    group.count++;
    group.entries.push(entry);
    if (entry.at < group.firstAt) group.firstAt = entry.at;
  }
  return [...groups.values()];
}

/** Запись целиком текстом — для «Скопировать»: в чат, в задачу, в поиск по коду. */
export function entryText(entry: LogEntry): string {
  const head = `${entry.at} ${entry.level.toUpperCase()} ${entry.service} ${entry.context} ${entry.message}`;
  return entry.stack ? `${head}\n${entry.stack.replace(/^/gm, '    ')}` : head;
}

const dateTime = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'medium' });
const relative = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });

export function formatAt(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** «5 минут назад» — чтобы сразу видеть, свежая это поломка или давняя. */
export function ago(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return relative.format(seconds, 'second');
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

/**
 * Разбор логов ошибок из logs/ (на хосте — рядом с сервисами, см. src/common/error-log.ts
 * любого сервиса и nginx/main.conf). Форматов два:
 *
 *   сервисы: `2026-09-26T10:00:00.000Z ERROR order-server GET /order/api/v1/zayavka/5 relation … does not exist`
 *            и строки стека с отступом;
 *   nginx:   `2026/09/26 10:00:00 [error] 31#31: *951 connect() failed … request: "POST /user/… HTTP/1.1" …`
 *
 * Строка без отступа, не похожая ни на один заголовок, — продолжение предыдущей записи:
 * многострочное сообщение (у ошибок Postgres бывает) не должно рваться на куски.
 */
export type LogEntry = {
  /** Файл и номер строки заголовка — устойчивый ключ для таблицы. */
  id: string;
  file: string;
  line: number;
  service: string;
  /** ISO-время в UTC. */
  at: string;
  level: string;
  /** Где случилось: `GET /путь`, `migrate`, `bootstrap`… */
  context: string;
  message: string;
  stack: string;
};

const SERVICE_HEAD = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z) (\S+) (\S+) (.*)$/;
const NGINX_HEAD = /^(\d{4})\/(\d\d)\/(\d\d) (\d\d:\d\d:\d\d) \[(\w+)\] (.*)$/;
const HTTP_CONTEXT = /^((?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \S+) ?(.*)$/;
// Контексты сервисов, в которых есть пробел, — остальные одно слово (migrate, bootstrap…).
const SPACED_CONTEXTS = ['вне запроса'];

/** Контекст у сервисов пишется перед сообщением без разделителя — отделяем по форме. */
function splitContext(rest: string): { context: string; message: string } {
  const http = HTTP_CONTEXT.exec(rest);
  if (http) return { context: http[1], message: http[2] };
  for (const spaced of SPACED_CONTEXTS) {
    if (rest.startsWith(`${spaced} `)) return { context: spaced, message: rest.slice(spaced.length + 1) };
  }
  const space = rest.indexOf(' ');
  return space < 0
    ? { context: rest, message: '' }
    : { context: rest.slice(0, space), message: rest.slice(space + 1) };
}

/**
 * nginx: `31#31: *951 текст, client: …, request: "POST /x HTTP/1.1", upstream: …`.
 * pid#tid и номер соединения — шум; запрос, если есть, — это и есть «где».
 */
function nginxEntry(rest: string): { context: string; message: string } {
  const message = rest.replace(/^\d+#\d+: (\*\d+ )?/, '');
  const request = /request: "(\S+ \S+)/.exec(message);
  return { context: request ? request[1] : 'nginx', message };
}

/** Имя сервиса из имени файла: order-server.log, order-server.log.1 → order-server. */
export function serviceOf(file: string): string {
  return file.replace(/\.log(\.\d+)?$/, '');
}

export function parseLog(file: string, text: string): LogEntry[] {
  const entries: LogEntry[] = [];
  const fallbackService = serviceOf(file);
  const lines = text.split('\n');

  lines.forEach((raw, index) => {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) return;

    const service = SERVICE_HEAD.exec(line);
    if (service) {
      const [, at, level, name, rest] = service;
      entries.push({
        id: `${file}:${index + 1}`,
        file,
        line: index + 1,
        service: name,
        at,
        level: level.toLowerCase(),
        ...splitContext(rest),
        stack: '',
      });
      return;
    }

    const nginx = NGINX_HEAD.exec(line);
    if (nginx) {
      const [, y, m, d, time, level, rest] = nginx;
      entries.push({
        id: `${file}:${index + 1}`,
        file,
        line: index + 1,
        service: fallbackService,
        // Время nginx — локальное время контейнера, а в официальном образе это UTC.
        at: `${y}-${m}-${d}T${time}.000Z`,
        level,
        ...nginxEntry(rest),
        stack: '',
      });
      return;
    }

    const last = entries.at(-1);
    if (!last) return; // обрывок начала файла после ротации — приписать не к чему
    if (/^\s/.test(line)) last.stack += (last.stack ? '\n' : '') + line.trim();
    else last.message += `\n${line}`;
  });

  return entries;
}

/** Новые сверху; при равном времени — что ниже в файле, то и новее. */
export function newestFirst(a: LogEntry, b: LogEntry): number {
  if (a.at !== b.at) return a.at < b.at ? 1 : -1;
  if (a.file !== b.file) return a.file < b.file ? 1 : -1;
  return b.line - a.line;
}

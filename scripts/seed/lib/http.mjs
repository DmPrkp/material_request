import http from 'node:http';
import https from 'node:https';

/**
 * Запрос к API через nginx. На встроенном http, а не на fetch: глобального fetch
 * нет в Node 16, а скрипт должен запускаться тем, что стоит на машине, без npm install.
 */
export class ApiError extends Error {
  constructor(method, url, status, body) {
    super(`${method} ${url} → ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

export function createApi(baseUrl) {
  const base = new URL(baseUrl);
  const transport = base.protocol === 'https:' ? https : http;

  function request(method, path, { token, body, headers = {} } = {}) {
    const url = new URL(path, base);
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const options = {
      method,
      headers: {
        Accept: 'application/json',
        // Словарь отдаёт названия на языке запроса, а заявка хранит их как показала расчёт.
        'Accept-Language': 'ru',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    };

    return new Promise((resolve, reject) => {
      const req = transport.request(url, options, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data = text;
          try {
            data = text ? JSON.parse(text) : undefined;
          } catch {
            // не JSON — отдаём как есть (например, html-страница ошибки nginx)
          }
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
          else reject(new ApiError(method, url.pathname + url.search, res.statusCode, data));
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  return {
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts) => request('POST', path, { ...opts, body }),
    put: (path, body, opts) => request('PUT', path, { ...opts, body }),
    patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  };
}

/** Все страницы списка вида { items, pages }: лимит у сервисов — не больше 200. */
export async function getAllPages(api, path, opts) {
  const sep = path.includes('?') ? '&' : '?';
  const items = [];
  for (let page = 1; ; page++) {
    const res = await api.get(`${path}${sep}page=${page}&limit=200`, opts);
    items.push(...res.items);
    if (page >= res.pages) return items;
  }
}

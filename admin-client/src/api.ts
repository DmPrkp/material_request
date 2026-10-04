import { ref } from 'vue';

const BASE = '/admin/api/v1';
const TOKEN_KEY = 'admin_token';

export type AdminUser = { id: number; login: string; firstName: string; lastName: string | null; role: string };

/** Форма добавления, которую показывает таблица (forms/). */
export type CreateKind = 'material_variant' | 'hand_tool_variant';

export type TableInfo = { key: string; db: string; group: string; title: string; from: string; create?: CreateKind };

export type ColumnType = 'number' | 'boolean' | 'date' | 'json' | 'array' | 'text';
export type Column = { field: string; type: ColumnType; ref?: boolean };
export type Row = Record<string, unknown> & { $labels?: Record<string, string | null> };

export type TableData = TableInfo & { columns: Column[]; rows: Row[]; truncated: boolean; limit: number };

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Реактивный: App.vue по нему решает, показывать вход или таблицы. */
export const token = ref<string | null>(readToken());

export function setToken(value: string | null): void {
  token.value = value;
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // приватное окно — токен проживёт до перезагрузки, и ладно
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Текст ошибки для человека. Zod в сервисах отвечает «Validation failed» и списком errors —
 * без них не понять, какое поле не так.
 */
function errorText(body: unknown): string | undefined {
  const { message, errors } = (body ?? {}) as { message?: unknown; errors?: { path?: unknown[]; message?: string }[] };
  const text = Array.isArray(message) ? message.join('; ') : typeof message === 'string' ? message : undefined;
  if (!Array.isArray(errors) || !errors.length) return text;
  const details = errors.map((e) => `${(e.path ?? []).join('.') || 'тело'}: ${e.message ?? '?'}`).join('; ');
  return text ? `${text} — ${details}` : details;
}

async function request<T>(path: string, init: RequestInit = {}, { proxied = false } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token.value) headers.set('Authorization', `Bearer ${token.value}`);
  // FormData (загрузка снимков) ставит свой multipart с границей — Content-Type не трогаем.
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json');

  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    // Протух токен или сняли роль — обратно на вход, а не ошибка на каждой таблице.
    // Но 403 сервиса через прокси — «нельзя это», а не «вы не админ»: из админки не выкидываем.
    if (response.status === 401 || (!proxied && response.status === 403)) setToken(null);
    throw new ApiError(response.status, errorText(body) ?? response.statusText);
  }
  return body as T;
}

export const api = {
  login: (login: string, password: string) =>
    request<{ accessToken: string; user: AdminUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),
  me: () => request<AdminUser>('/auth/me'),
  tables: () => request<TableInfo[]>('/tables'),
  table: (key: string) => request<TableData>(`/tables/${encodeURIComponent(key)}`),
  logs: () => request<LogsData>('/logs'),
  /** Файл лога как есть — текстом, не JSON. */
  logFile: async (name: string) => {
    const response = await fetch(`${BASE}/logs/files/${encodeURIComponent(name)}`, {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    });
    if (response.status === 401) setToken(null);
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return response.text();
  },
};

/** Снимки технологий (admin-server/src/images): файлы public/system клиента и их привязки. */
export type ImageOptions = { width: number; height: number | null; quality: number; position: 'attention' | 'centre' };
export type ImageFile = { name: string; size: number; width?: number; height?: number; format?: string; usedBy: string[] };
export type ImagesState = {
  enabled: boolean;
  files: ImageFile[];
  map: Record<string, { src: string; alt?: string }>;
  defaults: ImageOptions;
};
export type ImagePreview = {
  original: { width?: number; height?: number; format?: string; size: number };
  result: { width: number; height: number; size: number };
  dataUrl: string;
};

function imageForm(file: Blob, options: ImageOptions, extra: Record<string, string | undefined> = {}): FormData {
  const form = new FormData();
  form.append('file', file);
  form.append('width', String(options.width));
  form.append('height', String(options.height ?? 0));
  form.append('quality', String(options.quality));
  form.append('position', options.position);
  for (const [key, value] of Object.entries(extra)) if (value) form.append(key, value);
  return form;
}

export const images = {
  state: () => request<ImagesState>('/images'),
  preview: (file: Blob, options: ImageOptions) =>
    request<ImagePreview>('/images/preview', { method: 'POST', body: imageForm(file, options) }),
  save: (file: Blob, options: ImageOptions, name: string, title?: string, alt?: string) =>
    request<{ file: string; size: number; width: number; height: number }>('/images', {
      method: 'POST',
      body: imageForm(file, options, { name, title, alt }),
    }),
  assign: (title: string, file: string | null) =>
    request<unknown>(`/images/map/${encodeURIComponent(title)}`, { method: 'PUT', body: JSON.stringify({ file }) }),
  remove: (name: string) => request<unknown>(`/images/files/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  /** Миниатюра: img с токеном не ходит — тянем fetch-ем и отдаём object URL. */
  blobUrl: async (name: string) => {
    const response = await fetch(`${BASE}/images/files/${encodeURIComponent(name)}`, {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    });
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return URL.createObjectURL(await response.blob());
  },
};

/** Запись лога ошибок (admin-server/src/logs/parse.ts). */
export type LogEntry = {
  id: string;
  file: string;
  line: number;
  service: string;
  at: string;
  level: string;
  context: string;
  message: string;
  stack: string;
};
export type LogFile = { name: string; service: string; size: number; modifiedAt: string };
export type LogsData = { dir: string; files: LogFile[]; entries: LogEntry[]; total: number; limit: number };

/**
 * API словаря через admin-server (proxy.controller.ts): запись идёт от имени вошедшего
 * админа и по правилам словаря — код сборки, 409 на дубль. Путь — как у самого словаря.
 */
export const dict = {
  get: <T>(path: string) => request<T>(`/proxy/dict${path}`, {}, { proxied: true }),
  post: <T>(path: string, body: unknown) =>
    request<T>(`/proxy/dict${path}`, { method: 'POST', body: JSON.stringify(body) }, { proxied: true }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(`/proxy/dict${path}`, { method: 'PATCH', body: JSON.stringify(body) }, { proxied: true }),
};

/** Страница списка словаря. */
export type Page<T> = { items: T[]; total: number };

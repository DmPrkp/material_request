/**
 * Ответ не 2xx. message по-прежнему statusText — старые вызовы его и показывают, —
 * а status нужен тем, кто различает «войдите заново» (401) и «уже есть» (409):
 * по HTTP/2 statusText вообще пустой.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    statusText: string,
  ) {
    super(statusText);
    this.name = "HttpError";
  }
}

export default class BaseModel {
  static baseURL: string;

  static apiVersion = "/";

  static baseOpts: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  static setAuthToken(token?: string, scheme = "Bearer") {
    const headers = (this.baseOpts.headers || {}) as Record<string, string>;

    if (token) {
      const trimmedScheme = scheme?.trim();
      headers["Authorization"] = trimmedScheme
        ? `${trimmedScheme} ${token}`.trim()
        : token;
    } else {
      delete headers["Authorization"];
    }

    this.baseOpts.headers = headers;
  }

  /**
   * Язык ответов: словарь отдаёт одно name/description на этом языке (или русское,
   * если перевода нет). Ставит setI18nLocale — единая точка смены языка.
   */
  static setLocale(locale: string) {
    const headers = (this.baseOpts.headers || {}) as Record<string, string>;
    headers["Accept-Language"] = locale;
    this.baseOpts.headers = headers;
  }

  static setBaseUrl(url?: string | undefined) {
    const port = import.meta.env.VITE_PORT
      ? `:${import.meta.env.VITE_PORT}`
      : "";
    this.baseURL =
      url || `${import.meta.env.VITE_PROTOCOL}://${location.hostname + port}`;
  }

  private static buildUrl(params: string, queries: string[] = []) {
    const isAbsolute = /^https?:\/\//i.test(params);
    const hasQuery = params.includes("?");
    const querySuffix = queries.length
      ? `${hasQuery ? "&" : "?"}${queries.join("&")}`
      : "";

    if (isAbsolute) {
      return `${params}${querySuffix}`;
    }

    const base = `${this.baseURL}${this.apiVersion}${params}`;
    if (!queries.length) {
      return base;
    }

    return `${base}${hasQuery ? "&" : "?"}${queries.join("&")}`;
  }

  static async get<R>(params: string): Promise<R | undefined> {
    try {
      const url = this.buildUrl(params);
      // Заголовки нужны и GET-у: без Authorization закрытые эндпоинты (профиль) отвечали 401.
      const response = await fetch(url, { headers: this.baseOpts.headers });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
    }
  }

  static async post<R>({
    params,
    queries = [],
    body,
    opts,
  }: {
    params: string;
    body?: Record<string, unknown>;
    queries?: string[];
    opts?: RequestInit;
  }): Promise<R> {
    const query = this.buildUrl(params, queries);

    const options = Object.assign(
      {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      },
      this.baseOpts,
      opts
    );

    const response = await fetch(query, options);

    if (!response.ok) {
      throw new HttpError(response.status, response.statusText);
    }

    return response.json();
  }

  static async patch<R>({
    params,
    body,
    opts,
  }: {
    params: string;
    body?: Record<string, unknown>;
    opts?: RequestInit;
  }): Promise<R> {
    const options = Object.assign(
      {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      },
      this.baseOpts,
      opts
    );

    const response = await fetch(this.buildUrl(params), options);

    if (!response.ok) {
      throw new HttpError(response.status, response.statusText);
    }

    return response.json();
  }

  static async put<R>({
    params,
    queries = [],
    body,
    opts,
  }: {
    params: string;
    body?: Record<string, unknown>;
    queries?: string[];
    opts?: RequestInit;
  }): Promise<R> {
    const query = this.buildUrl(params, queries);

    const options = Object.assign(
      {
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
      },
      this.baseOpts,
      opts
    );

    const response = await fetch(query, options);

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return await response.json();
  }

  static async downloadFile({
    params,
    queries = [],
    body,
    opts,
  }: {
    params: string;
    body?: Record<string, unknown>;
    queries?: string[];
    opts?: RequestInit;
  }): Promise<void> {
    const queryString = queries.length ? `?${queries.join("&")}` : "";
    const query = `${this.baseURL}${this.apiVersion}${params}${queryString}`;

    const options = Object.assign(
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      this.baseOpts,
      opts
    );

    const response = await fetch(query, options);

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const blob = await response.blob();

    // Get file name from `Content-Disposition` header if provided
    const contentDisposition = response.headers.get("Content-Disposition");
    const fileName =
      contentDisposition?.match(/filename="(.+)"/)?.[1] ||
      "downloaded_file.xlsx";

    // Create a link element to trigger download
    const link = document.createElement("a");
    const url = window.URL.createObjectURL(blob);

    link.href = url;
    link.download = fileName;
    link.click();

    // Clean up the object URL after the download
    window.URL.revokeObjectURL(url);
  }
}

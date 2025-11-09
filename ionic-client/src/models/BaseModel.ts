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
      const response = await fetch(url);
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
      throw new Error(response.statusText);
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

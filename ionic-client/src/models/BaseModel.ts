export default class BaseModel {
  static baseURL: string;

  static apiVersion = "/";

  static baseOpts: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  static setBaseUrl(url?: string | undefined) {
    const port = import.meta.env.VITE_PORT
      ? `:${import.meta.env.VITE_PORT}`
      : "";
    this.baseURL =
      url || `${import.meta.env.VITE_PROTOCOL}://${location.hostname + port}`;
  }

  static async get<R>(params: string): Promise<R | undefined> {
    try {
      const url = this.baseURL + this.apiVersion + params;
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
    const queryString = queries.length ? `?${queries.join("&")}` : "";
    const query = `${this.baseURL}${this.apiVersion}${params}${queryString}`;

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

    return await response.json();
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
    const queryString = queries.length ? `?${queries.join("&")}` : "";
    const query = `${this.baseURL}${this.apiVersion}${params}${queryString}`;

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
}

export default class BaseModel {
  static baseURL: string;

  static apiVersion = "/api/v1";

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
      url ||
      `${import.meta.env.VITE_PROTOCOL}://${
        import.meta.env.VITE_BASE_HOST + port
      }`;
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

  static async post<R>(
    params: string,
    queries = [],
    opts?: RequestInit
  ): Promise<R | undefined> {
    try {
      const query = this.baseURL + this.apiVersion + params;
      const options = Object.assign({ method: "POST" }, this.baseOpts, opts);
      console.log(queries);
      const response = await fetch(query, options);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
    }
  }
}

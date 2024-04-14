export default class BaseModel {
  static baseURL: string;

  static apiVersion = "/api/v1";

  static baseOpts: RequestInit = {};

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

  static async get(
    params: Array<string> = [],
    queries = [],
    opts?: RequestInit
  ): Promise<any> {
    try {
      const query =
        this.baseURL +
        this.apiVersion +
        params.reduce((acc, param) => (acc += `/${param}`), "");
      const options = {
        ...this.baseOpts,
        ...opts,
      };
      if (!queries && !options) return;
      const response = await fetch(query);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
    }
  }

  static async post(
    params: Array<string> = [],
    queries = [],
    opts?: RequestInit
  ): Promise<any> {
    try {
      const query =
        this.baseURL +
        this.apiVersion +
        params.reduce((acc, param) => (acc += `/${param}`), "");
      const options = Object.assign({ method: "POST" }, this.baseOpts, opts);
      if (!queries && !options) return;
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

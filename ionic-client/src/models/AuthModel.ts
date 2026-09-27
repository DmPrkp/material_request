import BaseModel from './BaseModel';
import type { AuthResponse, RegisterPayload } from '@/types/dto/auth';

const DEFAULT_AUTH_PREFIX = '/user/api/v1';

const parsePaths = (value: string | undefined, defaults: string[]) => {
  if (!value) {
    return defaults;
  }

  const normalized = value.trim().toLowerCase();
  if (["none", "false", "off", "disable", "disabled"].includes(normalized)) {
    return [];
  }

  return value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const userApiPrefix =
  import.meta.env.VITE_USER_API_PREFIX ||
  import.meta.env.VITE_AUTH_API_PREFIX ||
  DEFAULT_AUTH_PREFIX;

const loginPaths = parsePaths(import.meta.env.VITE_USER_API_LOGIN_PATHS, [
  '/auth/login',
]);

const registerPaths = parsePaths(import.meta.env.VITE_USER_API_REGISTER_PATHS, [
  '/auth/register',
]);

const profilePaths = parsePaths(import.meta.env.VITE_USER_API_PROFILE_PATHS, [
  '/auth/me',
]);

const refreshPaths = parsePaths(import.meta.env.VITE_USER_API_REFRESH_PATHS, [
  '/auth/refresh',
]);

const credentialsEnv = import.meta.env.VITE_USER_API_CREDENTIALS;
const allowedCredentials: RequestCredentials[] = ['omit', 'same-origin', 'include'];
const requestCredentials = allowedCredentials.includes(
  credentialsEnv as RequestCredentials
)
  ? (credentialsEnv as RequestCredentials)
  : undefined;

const authRequestOpts = requestCredentials
  ? ({ credentials: requestCredentials } as RequestInit)
  : undefined;

export default class AuthModel extends BaseModel {
  static apiVersion = userApiPrefix;

  private static async postWithFallback(
    paths: string[],
    body: Record<string, unknown>
  ): Promise<AuthResponse> {
    let lastError: unknown;

    for (const path of paths) {
      try {
        return await this.post<AuthResponse>({
          params: path,
          body,
          opts: authRequestOpts,
        });
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error('Не удалось обратиться к серверу авторизации');
  }

  private static async getWithFallback(paths: string[]) {
    for (const path of paths) {
      const response = await this.get<unknown>(path);
      if (response !== undefined) {
        return response;
      }
    }

    return undefined;
  }

  static login(login: string, password: string) {
    return this.postWithFallback(loginPaths, {
      login,
      password,
    });
  }

  static register(payload: RegisterPayload) {
    return this.postWithFallback(registerPaths, { ...payload });
  }

  /** Свежий токен взамен живого; Authorization с текущим кладёт BaseModel.setAuthToken. */
  static refresh() {
    return this.postWithFallback(refreshPaths, {});
  }

  /**
   * Ручки почты добавлены позже и запасных путей не имеют: они появились сразу
   * в user-server, подменять их через env незачем.
   */
  static requestEmailVerification(locale: string) {
    return this.post<void>({
      params: '/auth/email/verify-request',
      body: { locale },
      opts: authRequestOpts,
    });
  }

  static verifyEmail(token: string) {
    return this.post<void>({ params: '/auth/email/verify', body: { token }, opts: authRequestOpts });
  }

  /** Отвечает 204 всегда — и на незнакомый адрес: узнать, кто зарегистрирован, нельзя. */
  static forgotPassword(email: string, locale: string) {
    return this.post<void>({
      params: '/auth/password/forgot',
      body: { email, locale },
      opts: authRequestOpts,
    });
  }

  static resetPassword(token: string, newPassword: string) {
    return this.post<void>({
      params: '/auth/password/reset',
      body: { token, newPassword },
      opts: authRequestOpts,
    });
  }

  static profile() {
    if (!profilePaths.length) {
      return Promise.resolve(undefined);
    }

    return this.getWithFallback(profilePaths);
  }
}

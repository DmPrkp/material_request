import BaseModel from './BaseModel';
import type { AuthResponse } from '@/types/dto/auth';

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
  '/auth/log-in',
]);

const registerPaths = parsePaths(import.meta.env.VITE_USER_API_REGISTER_PATHS, [
  '/auth/sign-in',
]);

const profilePaths = parsePaths(import.meta.env.VITE_USER_API_PROFILE_PATHS, [
  '/profile',
  '/auth/profile',
  '/users/me',
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

  static login(email: string, password: string) {
    return this.postWithFallback(loginPaths, {
      email,
      password,
    });
  }

  static register(email: string, password: string) {
    return this.postWithFallback(registerPaths, {
      email,
      password,
    });
  }

  static profile() {
    if (!profilePaths.length) {
      return Promise.resolve(undefined);
    }

    return this.getWithFallback(profilePaths);
  }
}

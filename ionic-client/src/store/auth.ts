import { defineStore } from 'pinia';
import AuthModel from '@/models/AuthModel';
import BaseModel from '@/models/BaseModel';
import type { AuthResponse, UserProfile } from '@/types/dto';

const TOKEN_STORAGE_KEY = 'mr-auth-token';

const normalizeScheme = (value?: string) => {
  if (!value) {
    return 'Bearer';
  }

  const trimmed = value.trim();
  if (["none", "off", "false", "disabled", "no"].includes(trimmed.toLowerCase())) {
    return '';
  }

  return trimmed;
};

const AUTH_HEADER_SCHEME = normalizeScheme(import.meta.env.VITE_USER_API_AUTH_SCHEME);

const TOKEN_KEYS = [
  'accessToken',
  'access_token',
  'token',
  'jwt',
  'id_token',
  'sessionToken',
  'session_token',
  'bearer',
];

const USER_IDENTIFIER_KEYS = ['id', 'userId', 'user_id', 'uuid', 'uid'];
const USER_EMAIL_KEYS = ['email', 'mail'];
const USER_USERNAME_KEYS = ['username', 'login', 'name'];
const USER_CREATED_KEYS = ['createdAt', 'created_at', 'created_on', 'created'];
const USER_UPDATED_KEYS = ['updatedAt', 'updated_at', 'updated_on', 'updated'];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const findStringByKeys = (source: unknown, keys: string[]): string | undefined => {
  if (Array.isArray(source)) {
    for (const item of source) {
      const value = findStringByKeys(item, keys);
      if (value) {
        return value;
      }
    }
    return undefined;
  }

  if (!isPlainObject(source)) {
    return undefined;
  }

  for (const key of keys) {
    const candidate = source[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const value of Object.values(source)) {
    const nested = findStringByKeys(value, keys);
    if (nested) {
      return nested;
    }
  }

  return undefined;
};

const normalizeDate = (value: unknown): string | undefined => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return undefined;
};

const findUserCandidate = (
  source: unknown,
  visited = new WeakSet<object>()
): Record<string, unknown> | undefined => {
  if (Array.isArray(source)) {
    for (const item of source) {
      const candidate = findUserCandidate(item, visited);
      if (candidate) {
        return candidate;
      }
    }
    return undefined;
  }

  if (!isPlainObject(source)) {
    return undefined;
  }

  if (visited.has(source)) {
    return undefined;
  }

  visited.add(source);

  const hasIdentifier = USER_IDENTIFIER_KEYS.some((key) => key in source);
  const hasContact =
    USER_EMAIL_KEYS.some((key) => key in source) ||
    USER_USERNAME_KEYS.some((key) => key in source);

  if (hasIdentifier || hasContact) {
    return source;
  }

  for (const value of Object.values(source)) {
    const nested = findUserCandidate(value, visited);
    if (nested) {
      return nested;
    }
  }

  return undefined;
};

const normalizeUserProfile = (payload: unknown): UserProfile | null => {
  if (!payload) {
    return null;
  }

  const candidate = findUserCandidate(payload);
  if (!candidate) {
    return null;
  }

  const identifier =
    candidate.id ?? candidate.userId ?? candidate.user_id ?? candidate.uuid ?? candidate.uid;

  if (typeof identifier !== 'string' && typeof identifier !== 'number') {
    return null;
  }

  const email = findStringByKeys(candidate, USER_EMAIL_KEYS);
  const username = findStringByKeys(candidate, USER_USERNAME_KEYS);
  const createdAt = normalizeDate(
    USER_CREATED_KEYS.map((key) => candidate[key]).find((value) => value !== undefined)
  );
  const updatedAt = normalizeDate(
    USER_UPDATED_KEYS.map((key) => candidate[key]).find((value) => value !== undefined)
  );

  return {
    id: identifier,
    email,
    username,
    createdAt,
    updatedAt,
  };
};

const extractToken = (payload: unknown): string | undefined => {
  if (!payload) {
    return undefined;
  }

  return findStringByKeys(payload, TOKEN_KEYS);
};

class MissingTokenError extends Error {
  constructor() {
    super('Пустой ответ от сервера');
    this.name = 'MissingTokenError';
  }
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
    status: 'idle',
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    setToken(token: string | null) {
      this.token = token;
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      BaseModel.setAuthToken(token ?? undefined, AUTH_HEADER_SCHEME);
    },
    setUser(user: UserProfile | null) {
      this.user = user;
    },
    clearError() {
      this.error = null;
    },
    async login(email: string, password: string) {
      this.status = 'loading';
      this.clearError();
      try {
        const response = await AuthModel.login(email, password);
        this.applyAuthResponse(response);
        await this.fetchProfile();
      } catch (error) {
        this.status = 'error';
        this.error =
          error instanceof Error ? error.message : 'Не удалось войти. Попробуйте снова.';
        throw error;
      } finally {
        if (this.status !== 'error') {
          this.status = 'idle';
        }
      }
    },
    async register(email: string, password: string) {
      this.status = 'loading';
      this.clearError();
      try {
        const response = await AuthModel.register(email, password);
        try {
          this.applyAuthResponse(response);
        } catch (error) {
          if (error instanceof MissingTokenError) {
            const loginResponse = await AuthModel.login(email, password);
            this.applyAuthResponse(loginResponse);
          } else {
            throw error;
          }
        }
        await this.fetchProfile();
      } catch (error) {
        this.status = 'error';
        this.error =
          error instanceof Error
            ? error.message
            : 'Не удалось зарегистрироваться. Попробуйте снова.';
        throw error;
      } finally {
        if (this.status !== 'error') {
          this.status = 'idle';
        }
      }
    },
    async fetchProfile() {
      if (!this.token) return;
      try {
        const profile = await AuthModel.profile();
        const normalizedProfile = normalizeUserProfile(profile);
        if (normalizedProfile) {
          this.setUser(normalizedProfile);
        }
        return normalizedProfile ?? null;
      } catch (error) {
        console.error('Не удалось получить профиль пользователя', error);
        return null;
      }
    },
    initialize() {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        this.setToken(storedToken);
      }
    },
    logout() {
      this.setToken(null);
      this.setUser(null);
      this.status = 'idle';
      this.error = null;
    },
    applyAuthResponse(response: AuthResponse) {
      const token = extractToken(response);
      if (!token) {
        throw new MissingTokenError();
      }

      this.setToken(token);

      const userSources = [
        response.user,
        response.profile,
        isPlainObject(response.data) ? response.data : undefined,
        response,
      ];

      for (const source of userSources) {
        const normalized = normalizeUserProfile(source);
        if (normalized) {
          this.setUser(normalized);
          break;
        }
      }
    },
  },
});

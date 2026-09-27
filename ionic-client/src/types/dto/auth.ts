export type AuthResponse = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  jwt?: string;
  data?: unknown;
  user?: unknown;
  profile?: unknown;
  [key: string]: unknown;
};

export type RegisterPayload = {
  login: string;
  password: string;
  firstName: string;
  lastName?: string;
  /** Необязательна: вход по логину, почта нужна только чтобы восстановить пароль. */
  email?: string;
  /** Язык письма и локаль в ссылке — сервер своей не знает. */
  locale?: string;
};

export type UserProfile = {
  id: string | number;
  email?: string;
  /** null — адрес не подтверждён, восстановление по нему не работает. */
  emailVerifiedAt?: string | null;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
};

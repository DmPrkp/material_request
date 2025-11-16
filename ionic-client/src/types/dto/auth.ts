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

export type UserProfile = {
  id: string | number;
  email?: string;
  username?: string;
  createdAt?: string;
  updatedAt?: string;
};

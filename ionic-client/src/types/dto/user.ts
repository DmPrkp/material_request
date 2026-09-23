/** Имя пользователя для чужих глаз — GET /users/names (без логина). */
export type UserName = {
  id: number;
  firstName: string;
  lastName: string | null;
};

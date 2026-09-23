import type { User } from '~/db/schema';

export type PublicUser = Omit<User, 'password'>;

// Поля перечислены явно, а не через «всё, кроме password»: новое чувствительное
// поле в модели не уйдёт наружу, пока его сюда не добавят руками.
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    login: user.login,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

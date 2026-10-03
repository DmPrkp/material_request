import BaseModel from "./BaseModel";
import type { UserName } from "@/types/dto";
import type { UserProfile } from "@/types/dto/auth";

/**
 * Пользователи глазами других — только имена по id. Вход и профиль — в AuthModel:
 * там свои пути, настраиваемые env.
 */
export default class UserModel extends BaseModel {
  static apiVersion = "/user/api/v1";

  /**
   * Своё — правит только сам владелец: id сервер берёт из токена, а не из пути.
   * `email: null` убирает адрес, новый приезжает неподтверждённым и тянет письмо.
   */
  static updateMe(data: {
    email?: string | null;
    firstName?: string;
    lastName?: string | null;
    locale: string;
  }) {
    return this.patch<UserProfile>({ params: "/users/me", body: data });
  }

  /** Имена по id; неизвестных в ответе нет. undefined — не достучались. */
  static names(ids: number[]) {
    return this.get<UserName[]>(`/users/names?ids=${ids.join(",")}`);
  }
}

/** «Иван Петров»; без имени — id, чтобы строка не была пустой. */
export function userLabel(user: UserName | undefined, id: number): string {
  if (!user) return `#${id}`;
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

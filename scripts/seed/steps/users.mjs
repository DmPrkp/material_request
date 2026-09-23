import { ApiError } from '../lib/http.mjs';
import { person } from '../lib/fixtures.mjs';

const AUTH = '/user/api/v1/auth';

export const loginOf = (prefix, i) => `${prefix}${String(i + 1).padStart(2, '0')}`;

/**
 * Пользователи demo01…demoNN с общим паролем. Сначала вход, регистрация — только если
 * такого нет: повторный прогон просто получает свежие токены. Логин занят с другим
 * паролем — останавливаемся, а не заводим пользователя под чужим логином.
 */
export async function ensureUsers(api, { count, prefix, password }) {
  const users = [];
  let created = 0;

  for (let i = 0; i < count; i++) {
    const login = loginOf(prefix, i);
    let auth;
    try {
      auth = await api.post(`${AUTH}/login`, { login, password });
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) throw err;
      try {
        auth = await api.post(`${AUTH}/register`, { login, password, ...person(i) });
        created++;
      } catch (regErr) {
        if (regErr instanceof ApiError && regErr.status === 409) {
          throw new Error(`Логин ${login} уже занят с другим паролем — задайте --password или --prefix`);
        }
        throw regErr;
      }
    }
    users.push({ id: auth.user.id, login, firstName: auth.user.firstName, token: auth.accessToken });
  }

  return { users, created };
}

/**
 * Существующие аккаунты, через которые смотрят на демо-данные (--join): логин или id.
 *
 * Заявки аккаунту заводятся от его имени — автора order-server берёт только из
 * X-User-Id. По логину с паролем входим и идём через nginx с токеном. По id — мимо
 * nginx прямо в порт сервиса с X-User-* (у каждого запроса свои заголовки): в dev
 * порты открыты и заголовку верят намеренно (auth-user.ts), на проде порт закрыт, и
 * такой запрос просто не дойдёт. Роль — USER: заводить свои заявки хватает её.
 */
export async function resolveJoined(api, join, password) {
  const joined = [];
  for (const ref of join) {
    if (/^\d+$/.test(ref)) {
      joined.push({ id: Number(ref), headers: { 'X-User-Id': ref, 'X-User-Role': 'USER' } });
      continue;
    }
    if (!password) throw new Error(`--join ${ref}: для входа по логину нужен --join-password или SEED_JOIN_PASSWORD`);
    try {
      const auth = await api.post(`${AUTH}/login`, { login: ref, password });
      joined.push({ id: auth.user.id, login: ref, token: auth.accessToken });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) throw new Error(`--join ${ref}: неверный логин или пароль`);
      throw err;
    }
  }
  return joined;
}

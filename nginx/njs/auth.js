/**
 * Проверка токена user-server на входе — вместо JwtAuthGuard в каждом сервисе.
 *
 * nginx проверяет подпись HS256 общим JWT_SECRET, срок и форму payload и передаёт итог
 * сервисам заголовками X-User-Id / X-User-Role (snippets/gateway-auth.conf). Сервисы
 * секрета не знают и верят заголовкам — поэтому на проде их порты наружу не опубликованы
 * (compose.prod.yaml): иначе заголовок подделал бы любой, кто стучится мимо nginx.
 *
 * Подпись проверяем сами, без библиотеки: auth_jwt есть только в NGINX Plus. Грабли,
 * которые закрывает jsonwebtoken, закрыты здесь руками — алгоритм закреплён (alg: none
 * и RS/HS-подмена не проходят), подпись сравнивается за постоянное время, exp и nbf
 * проверяются. Тесты — auth.test.js, гоняются njs из образа nginx.
 *
 * Модуль без состояния: njs заводит виртуальную машину на каждый запрос.
 */
import crypto from 'crypto';

/** Итог проверки: кто спрашивает, или почему ответить надо самому nginx. */
const ANONYMOUS = { status: 'anonymous' };
const INVALID = { status: 'invalid' };
const UNCONFIGURED = { status: 'unconfigured' };

const ROLES = ['USER', 'ADMIN'];

/**
 * Разбор и проверка токена. now — секунды, отдельным аргументом ради тестов.
 * Возвращает { status: 'ok', id, role } или INVALID.
 */
function verify(token, secret, now) {
  const parts = token.split('.');
  if (parts.length !== 3) return INVALID;

  const header = parseJson(parts[0]);
  // Закрепляем алгоритм по заголовку до проверки подписи: alg: none и прочее — мимо.
  if (!header || header.alg !== 'HS256') return INVALID;

  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (!safeEqual(expected, parts[2])) return INVALID;

  const payload = parseJson(parts[1]);
  if (!payload) return INVALID;
  if (typeof payload.exp === 'number' && now >= payload.exp) return INVALID;
  if (typeof payload.nbf === 'number' && now < payload.nbf) return INVALID;

  // Форма — как у user-server (user-server/src/auth/jwt-payload.ts). Подпись наша, но
  // заголовок сервисам уходит только из проверенных значений, а не из чего попало.
  if (!Number.isInteger(payload.sub) || payload.sub <= 0) return INVALID;
  if (ROLES.indexOf(payload.role) === -1) return INVALID;

  return { status: 'ok', id: payload.sub, role: payload.role };
}

/** Кто прислал запрос: без Authorization — аноним, чужая схема — битый. */
function check(authorization, secret, now) {
  if (!authorization) return ANONYMOUS;

  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization);
  if (!match) return INVALID;

  // Без секрета проверить нечем. Не аноним: вошедший молча потерял бы своё, а клиент
  // решил бы, что вход протух. 503 — чинить надо конфиг, а не вход.
  if (!secret) return UNCONFIGURED;

  return verify(match[1], secret, now);
}

/** Одна проверка на запрос: js_set зовёт каждую переменную отдельно. */
function resultFor(r) {
  if (!r.variables.auth_checked) {
    const result = check(r.headersIn.Authorization, process.env.JWT_SECRET, Math.floor(Date.now() / 1000));
    r.variables.auth_checked = JSON.stringify(result);
  }
  return JSON.parse(r.variables.auth_checked);
}

/** $auth_status: anonymous | ok | invalid | unconfigured. */
function status(r) {
  return resultFor(r).status;
}

/** $auth_user_id / $auth_user_role — пусто у анонима, и nginx тогда заголовок не шлёт. */
function userId(r) {
  const result = resultFor(r);
  return result.status === 'ok' ? String(result.id) : '';
}

function userRole(r) {
  const result = resultFor(r);
  return result.status === 'ok' ? result.role : '';
}

function parseJson(part) {
  try {
    const value = JSON.parse(Buffer.from(part, 'base64url').toString());
    return value && typeof value === 'object' ? value : undefined;
  } catch (e) {
    return undefined;
  }
}

/** Сравнение без раннего выхода: по времени ответа подпись не подобрать. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default { status, userId, userRole, check };

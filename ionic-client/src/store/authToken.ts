/**
 * Срок жизни JWT на клиенте.
 *
 * Токен живёт в localStorage и переживает закрытие вкладки. user-server выдаёт его
 * на три дня (JWT_EXPIRES_IN), а стор раз в сутки меняет на свежий (POST /auth/refresh):
 * кто заходит хоть раз в три дня, из аккаунта не вылетает.
 *
 * Пока стор судил о входе только по наличию токена, после exp интерфейс продолжал
 * показывать кнопки записи, а словарь на каждое сохранение отвечал 401. Подпись здесь
 * не проверяем — это дело сервера; нам хватает exp и iat.
 */

/** Как часто менять токен на свежий: раз в сутки от выдачи. */
export const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** payload токена; не разобрать — undefined. */
function readPayload(token: string): Record<string, unknown> | undefined {
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    // base64url -> base64; недостающие '=' atob по спецификации прощает.
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Числовое поле payload в миллисекундах; токен не разобрать или поля нет — undefined. */
function readTimeClaim(token: string, claim: "exp" | "iat"): number | undefined {
  const value = readPayload(token)?.[claim];
  return typeof value === "number" ? value * 1000 : undefined;
}

/**
 * Кто вошёл — из самого токена (sub, role), как его видит словарь.
 *
 * Не из профиля: профиль приезжает отдельным запросом и после перезагрузки есть не
 * сразу, а кнопки «удалить» должны встать по правам с первой отрисовки. Решает всё
 * равно сервер — здесь только подсказка интерфейса.
 */
export function tokenUser(token: string): { id: number; role: string } | undefined {
  const payload = readPayload(token);
  const id = payload?.sub;
  if (typeof id !== "number") return undefined;
  return { id, role: typeof payload?.role === "string" ? payload.role : "USER" };
}

/** exp из payload в миллисекундах. */
export function tokenExpiresAt(token: string): number | undefined {
  return readTimeClaim(token, "exp");
}

/** iat (когда выдан) в миллисекундах. */
export function tokenIssuedAt(token: string): number | undefined {
  return readTimeClaim(token, "iat");
}

/**
 * Протух ли токен. Без exp считаем живым: решит сервер своим 401,
 * а BaseModel.onUnauthorized тогда выведет из аккаунта.
 */
export function isTokenExpired(token: string, now = Date.now()): boolean {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt !== undefined && expiresAt <= now;
}

/**
 * Когда пора продлевать: через сутки после выдачи. Токен короче двух суток
 * (JWT_EXPIRES_IN=1h) — на середине срока, иначе он умер бы раньше, чем дошла
 * очередь. Без iat — undefined: неизвестно, когда выдан, не продлеваем.
 */
export function refreshDueAt(token: string): number | undefined {
  const issuedAt = tokenIssuedAt(token);
  if (issuedAt === undefined) return undefined;

  const byDay = issuedAt + REFRESH_INTERVAL_MS;
  const expiresAt = tokenExpiresAt(token);
  return expiresAt === undefined
    ? byDay
    : Math.min(byDay, issuedAt + (expiresAt - issuedAt) / 2);
}

/** Пора ли менять токен на свежий: срок продления настал, а сам он ещё жив. */
export function shouldRefresh(token: string, now = Date.now()): boolean {
  const dueAt = refreshDueAt(token);
  return dueAt !== undefined && dueAt <= now && !isTokenExpired(token, now);
}

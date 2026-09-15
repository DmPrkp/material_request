/**
 * Срок жизни JWT на клиенте.
 *
 * Токен живёт в localStorage и переживает закрытие вкладки, а выдаётся на час
 * (JWT_EXPIRES_IN у user-server). Пока стор судил о входе только по наличию
 * токена, через час интерфейс продолжал показывать кнопки записи, а словарь
 * на каждое сохранение отвечал 401. Подпись здесь не проверяем — это дело
 * сервера; нам хватает exp, чтобы не притворяться вошедшими.
 */

/** exp из payload в миллисекундах; токен не разобрать или exp нет — undefined. */
export function tokenExpiresAt(token: string): number | undefined {
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    // base64url -> base64; недостающие '=' atob по спецификации прощает.
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Протух ли токен. Без exp считаем живым: решит сервер своим 401,
 * а BaseModel.onUnauthorized тогда выведет из аккаунта.
 */
export function isTokenExpired(token: string, now = Date.now()): boolean {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt !== undefined && expiresAt <= now;
}

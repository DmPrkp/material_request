import { describe, expect, test } from "vitest";
import {
  isTokenExpired,
  refreshDueAt,
  shouldRefresh,
  tokenExpiresAt,
} from "@/store/authToken";

/**
 * Неподписанный JWT с нужным payload: подпись клиент не проверяет.
 * Кодируем как сервер — UTF-8 байты в base64url: голый btoa на кириллице падает.
 */
function jwt(payload: Record<string, unknown>): string {
  const encode = (part: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(part))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

describe("authToken", () => {
  const now = Date.UTC(2026, 8, 15);
  const inSeconds = (offset: number) => Math.floor(now / 1000) + offset;

  test("exp читается в миллисекундах", () => {
    expect(tokenExpiresAt(jwt({ sub: 1, exp: inSeconds(60) }))).toBe(
      (Math.floor(now / 1000) + 60) * 1000,
    );
  });

  test("истёкший токен — протух, живой — нет", () => {
    expect(isTokenExpired(jwt({ exp: inSeconds(-1) }), now)).toBe(true);
    expect(isTokenExpired(jwt({ exp: inSeconds(3600) }), now)).toBe(false);
  });

  test("кириллица в payload не ломает разбор (base64url)", () => {
    expect(tokenExpiresAt(jwt({ login: "иван", exp: inSeconds(10) }))).toBeDefined();
  });

  test("не JWT или без exp — считаем живым, решит сервер", () => {
    expect(isTokenExpired("not-a-jwt", now)).toBe(false);
    expect(isTokenExpired(jwt({ sub: 1 }), now)).toBe(false);
  });

  const DAY = 24 * 60 * 60;

  test("трёхдневный токен продлевается через сутки после выдачи", () => {
    const fresh = jwt({ iat: inSeconds(-60), exp: inSeconds(3 * DAY - 60) });
    const dayOld = jwt({ iat: inSeconds(-DAY - 1), exp: inSeconds(2 * DAY - 1) });

    expect(shouldRefresh(fresh, now)).toBe(false);
    expect(shouldRefresh(dayOld, now)).toBe(true);
    expect(refreshDueAt(fresh)).toBe((inSeconds(-60) + DAY) * 1000);
  });

  test("короткий токен продлевается на середине срока, а не через сутки", () => {
    // Часовой: выдан 40 минут назад, жить ещё 20 — середина пройдена.
    const hourly = jwt({ iat: inSeconds(-40 * 60), exp: inSeconds(20 * 60) });
    expect(shouldRefresh(hourly, now)).toBe(true);
  });

  test("протухший и без iat не продлеваем", () => {
    expect(shouldRefresh(jwt({ iat: inSeconds(-4 * DAY), exp: inSeconds(-DAY) }), now)).toBe(false);
    expect(shouldRefresh(jwt({ exp: inSeconds(DAY) }), now)).toBe(false);
    expect(refreshDueAt("not-a-jwt")).toBeUndefined();
  });
});

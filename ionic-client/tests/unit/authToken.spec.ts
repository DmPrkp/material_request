import { describe, expect, test } from "vitest";
import { isTokenExpired, tokenExpiresAt } from "@/store/authToken";

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
});

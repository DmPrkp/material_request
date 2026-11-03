import { afterEach, describe, expect, it, vi } from "vitest";
import type { RouteLocationNormalized } from "vue-router";

import { METRIKA_ID, trackPageView } from "./metrika";

const route = (fullPath: string, matched = 1) =>
  ({
    fullPath,
    matched: Array.from({ length: matched }),
  }) as unknown as RouteLocationNormalized;

describe("trackPageView", () => {
  afterEach(() => {
    delete (window as unknown as { ym?: unknown }).ym;
  });

  it("переход внутри SPA уходит hit-ом с адресом, откуда пришли, и заголовком", () => {
    const ym = vi.fn();
    Object.assign(window, { ym });
    document.title = "Калькулятор";
    trackPageView(route("/ru/calculator"), route("/ru/main"));
    const { origin } = window.location;
    expect(ym).toHaveBeenCalledWith(
      METRIKA_ID,
      "hit",
      `${origin}/ru/calculator`,
      {
        referer: `${origin}/ru/main`,
        title: "Калькулятор",
      },
    );
  });

  it("первую загрузку не дублирует: её уже отправил init в index.html", () => {
    const ym = vi.fn();
    Object.assign(window, { ym });
    trackPageView(route("/ru/main"), route("/", 0));
    expect(ym).not.toHaveBeenCalled();
  });

  it("без счётчика (dev, localhost) ничего не делает и не падает", () => {
    expect(() =>
      trackPageView(route("/ru/calculator"), route("/ru/main")),
    ).not.toThrow();
  });
});

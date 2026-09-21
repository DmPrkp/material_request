import { describe, expect, it } from "vitest";
import {
  materialTotal,
  roundConsumption,
} from "@/components/pagesParts/materials/materialTotal";

describe("roundConsumption", () => {
  it("держит 4 знака: 0.005 не становится 0.01, 0.0001 — нулём", () => {
    expect(roundConsumption(0.005)).toBe(0.005);
    expect(roundConsumption(0.0001)).toBe(0.0001);
    expect(roundConsumption(100 / 9999)).toBe(0.01);
  });
});

describe("materialTotal", () => {
  it("штучное — вверх до целого, в коде единицы и в подписи", () => {
    expect(materialTotal({ consumption: 0.092, volume: 9999, measure: "pcs" })).toBe(920);
    expect(materialTotal({ consumption: 0.092, volume: 9999, measure: "шт" })).toBe(920);
  });

  it("шум float не добавляет лишнюю штуку", () => {
    expect(materialTotal({ consumption: 0.07, volume: 100, measure: "pcs" })).toBe(7);
  });

  it("кг, л, м — два знака", () => {
    expect(materialTotal({ consumption: 0.092, volume: 9999, measure: "kg" })).toBe(919.91);
    expect(materialTotal({ consumption: 0.2, volume: 100, measure: "л" })).toBe(20);
  });
});

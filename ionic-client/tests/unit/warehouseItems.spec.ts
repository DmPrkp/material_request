import { describe, expect, it } from "vitest";
import { zaiavkaToWarehouseItems } from "@/components/pagesParts/warehouses/zaiavkaItems";
import type { ZaiavkaItemsSource } from "@/components/pagesParts/warehouses/zaiavkaItems";

const material = (uniqKey: string, consumption: number, volume: number) =>
  ({
    uniqKey,
    id: 7,
    title: "Клей",
    measure: "kg",
    params: [],
    description: "",
    consumption,
    volume,
  }) as ZaiavkaItemsSource["materials"][number]["materials"][number];

const stage = (
  id: number,
  materials: ZaiavkaItemsSource["materials"][number]["materials"],
) => ({ id, title: `этап ${id}`, materials });

describe("zaiavkaToWarehouseItems", () => {
  it("материал считает как на экране (расход × объём) и суммирует по этапам", () => {
    const items = zaiavkaToWarehouseItems({
      materials: [
        stage(1, [material("7:227", 2.5, 10)]),
        stage(2, [material("7:227", 1, 4)]),
      ],
      hand_tools: [],
      power_tools: [],
    });

    expect(items).toEqual([{ kind: "material", ref: "7:227", quantity: 29 }]);
  });

  it("инструмент берёт как есть: между этапами его свёл расчёт", () => {
    const items = zaiavkaToWarehouseItems({
      materials: [],
      hand_tools: [
        {
          uniqKey: "8:208",
          id: 8,
          title: "Шпатель",
          adjusted_consumption: 3,
          params: [],
        },
      ],
      power_tools: [
        {
          uniqKey: "12",
          id: 12,
          title: "Перфоратор",
          adjusted_consumption: 2,
          corded: true,
          params: [],
        },
      ],
    });

    expect(items).toEqual([
      { kind: "hand_tool", ref: "8:208", quantity: 3 },
      // У электроинструмента сборок нет — ссылка это id позиции.
      { kind: "power_tool", ref: "12", quantity: 2 },
    ]);
  });

  it("нули и позиции без кода сборки не едут: на складе им делать нечего", () => {
    const items = zaiavkaToWarehouseItems({
      materials: [
        stage(1, [material("7:227", 0, 10), material("", 2, 3)]),
      ],
      hand_tools: [],
      power_tools: [],
    });

    expect(items).toEqual([]);
  });

  it("пустая заявка — пустой список", () => {
    expect(
      zaiavkaToWarehouseItems({ materials: [], hand_tools: [], power_tools: [] }),
    ).toEqual([]);
  });
});

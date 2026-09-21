import { describe, expect, it } from "vitest";
import { mergeZaiavki } from "@/models/zaiavka/mergeZaiavki";
import type { ZaiavkaType } from "@/types/entity/zaiavka";

const handTool = (uniqKey: string, adjusted_consumption: number) => ({
  uniqKey,
  id: 1,
  title: "Шпатель",
  params: [],
  adjusted_consumption,
});

const powerTool = (uniqKey: string, adjusted_consumption: number) => ({
  uniqKey,
  id: 2,
  title: "Миксер",
  params: [],
  corded: true,
  adjusted_consumption,
});

const zaiavka = (over: Partial<ZaiavkaType>): ZaiavkaType => ({
  system: "EIFS",
  materials: [],
  hand_tools: [],
  power_tools: [],
  ...over,
});

describe("mergeZaiavki", () => {
  it("этапы идут подряд по заявкам в порядке создания, с номером заявки в названии", () => {
    const merged = mergeZaiavki(
      [
        { id: 9, data: zaiavka({ materials: [{ id: 1, title: "Грунт", materials: [] }] }) },
        {
          id: 4,
          data: zaiavka({
            materials: [
              { id: 1, title: "Грунт", materials: [] },
              { id: 2, title: "Клей", materials: [] },
            ],
          }),
        },
      ],
      "Дом"
    );

    expect(merged.name).toBe("Дом");
    expect(merged.materials.map((s) => s.title)).toEqual([
      "Грунт (№4)",
      "Клей (№4)",
      "Грунт (№9)",
    ]);
  });

  it("ручной инструмент складывается, электро — по максимуму", () => {
    const merged = mergeZaiavki(
      [
        {
          id: 1,
          data: zaiavka({
            hand_tools: [handTool("1:5", 2), handTool("1:6", 1)],
            power_tools: [powerTool("2", 1)],
          }),
        },
        {
          id: 2,
          data: zaiavka({
            hand_tools: [handTool("1:5", 3)],
            power_tools: [powerTool("2", 3)],
          }),
        },
        { id: 3, data: zaiavka({ power_tools: [powerTool("2", 2)] }) },
      ],
      "x"
    );

    expect(merged.hand_tools.map((t) => [t.uniqKey, t.adjusted_consumption])).toEqual([
      ["1:5", 5],
      ["1:6", 1],
    ]);
    expect(merged.power_tools.map((t) => t.adjusted_consumption)).toEqual([3]);
  });

  it("исходники не мутирует", () => {
    const source = zaiavka({ hand_tools: [handTool("1:5", 2)] });
    mergeZaiavki([{ id: 1, data: source }, { id: 2, data: source }], "x");
    expect(source.hand_tools[0].adjusted_consumption).toBe(2);
  });

  it("system — общий, если один; иначе перечень", () => {
    expect(mergeZaiavki([{ id: 1, data: zaiavka({}) }, { id: 2, data: zaiavka({}) }], "x").system).toBe("EIFS");
    expect(
      mergeZaiavki(
        [{ id: 1, data: zaiavka({}) }, { id: 2, data: zaiavka({ system: "frame_scaffold" }) }],
        "x"
      ).system
    ).toBe("EIFS, frame_scaffold");
  });
});

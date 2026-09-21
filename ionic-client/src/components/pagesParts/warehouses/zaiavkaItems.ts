import type { WarehouseItemInput } from "@/types/dto";
import type { ZaiavkaType } from "@/types/entity/zaiavka";

/** Списки заявки без служебных полей: на странице расчёта system лежит отдельно. */
export type ZaiavkaItemsSource = Pick<
  ZaiavkaType,
  "materials" | "hand_tools" | "power_tools"
>;

/**
 * Заявка → позиции склада.
 *
 * Материалы лежат по этапам, и одна сборка встречается на нескольких: на склад едет
 * сумма, а количество каждой строки — то же `consumption × volume`, что показано на
 * экране. Инструмент клиент свёл между этапами ещё при расчёте (максимум, а не сумма:
 * перфоратор переходит с этапа на этап), поэтому берётся как есть.
 *
 * Позиция без кода сборки пропускается: класть на склад нечего — по такой ссылке
 * словарь ничего не отдаст. У электроинструмента сборок нет, ссылка — id позиции.
 * Нули не едут: сервер их не принимает, а «ноль такого-то» на складе не нужен.
 */
export function zaiavkaToWarehouseItems(zaiavka: ZaiavkaItemsSource): WarehouseItemInput[] {
  const quantities = new Map<string, WarehouseItemInput>();

  const add = (kind: WarehouseItemInput["kind"], ref: string | undefined, quantity: number) => {
    if (!ref || !Number.isFinite(quantity) || quantity <= 0) return;
    const key = `${kind}:${ref}`;
    const saved = quantities.get(key);
    if (saved) saved.quantity = Number((saved.quantity + quantity).toFixed(4));
    else quantities.set(key, { kind, ref, quantity: Number(quantity.toFixed(4)) });
  };

  for (const stage of zaiavka.materials ?? []) {
    for (const material of stage.materials ?? []) {
      add("material", material.uniqKey, material.consumption * material.volume);
    }
  }
  for (const tool of zaiavka.hand_tools ?? []) {
    add("hand_tool", tool.uniqKey, tool.adjusted_consumption);
  }
  for (const tool of zaiavka.power_tools ?? []) {
    add("power_tool", tool.id ? String(tool.id) : undefined, tool.adjusted_consumption);
  }

  return [...quantities.values()];
}

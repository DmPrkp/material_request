import { useI18n } from "vue-i18n";
import { useParamLabel } from "@/components/pagesParts/catalog/paramLabel";
import DictionaryModel from "@/models/DictionaryModel";
import type {
  DictionaryVariantWithOwner,
  WarehouseItem,
  WarehouseItemKind,
} from "@/types/dto";

/** Порядок разделов — как в заявке: материалы, ручной, электро. */
export const ITEM_KINDS: WarehouseItemKind[] = [
  "material",
  "hand_tool",
  "power_tool",
];

/** Как позицию склада показать человеку: название, параметры сборки, единица. */
export type ItemLabel = {
  title: string;
  details: string;
  measure: string;
};

/**
 * Позиции склада названы ссылками (код сборки у материала и ручного инструмента, id у
 * электроинструмента) — названия и параметры добираем у словаря теми же запросами, что
 * нормы расхода. Не отдал словарь — показываем ссылку. Общее для склада и «на руках».
 */
export function useItemLabels() {
  const { t } = useI18n({ useScope: "global" });
  const { paramLabel, translate } = useParamLabel();

  /** Подписи по id строки склада. */
  async function itemLabels(
    items: WarehouseItem[]
  ): Promise<Map<number, ItemLabel>> {
    const refs = (kind: WarehouseItemKind) => [
      ...new Set(
        items.filter((item) => item.kind === kind).map((item) => item.ref)
      ),
    ];

    const [materials, handTools, powerTools] = await Promise.all([
      refs("material").length
        ? DictionaryModel.variantsByCodes("materials", refs("material"))
        : Promise.resolve([]),
      refs("hand_tool").length
        ? DictionaryModel.variantsByCodes("hand-tools", refs("hand_tool"))
        : Promise.resolve([]),
      refs("power_tool").length
        ? DictionaryModel.powerToolsByIds(refs("power_tool").map(Number))
        : Promise.resolve([]),
    ]);

    const byCode = new Map(
      [...(materials ?? []), ...(handTools ?? [])].map((variant) => [
        variant.code,
        variant,
      ])
    );
    const byId = new Map(
      (powerTools ?? []).map((tool) => [String(tool.id), tool])
    );

    return new Map(
      items.map((item) => {
        const variant = byCode.get(item.ref);
        const tool = byId.get(item.ref);
        const label: ItemLabel = {
          // Сборки уже нет (удалили или переписали параметры — код стал другим):
          // позиция на складе осталась, показываем её по ссылке, как в нормах расхода.
          title:
            variant?.owner.name ??
            tool?.name ??
            t("pages.catalog.norms.unknown", { id: item.ref }),
          details: variant ? variantDetails(variant) : "",
          measure: variant?.owner.unit
            ? translate(
                `measure.${variant.owner.unit.code}`,
                variant.owner.unit.code
              )
            : "",
        };
        return [item.id, label];
      })
    );
  }

  function variantDetails(variant: DictionaryVariantWithOwner) {
    return variant.params.map(paramLabel).join(" ");
  }

  return { itemLabels };
}

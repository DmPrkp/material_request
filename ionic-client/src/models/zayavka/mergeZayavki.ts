import type { MergedHandTool, PowerTool } from "@/types/dto";
import type { ZayavkaType } from "@/types/entity/zayavka";

export type MergeSource = { id: number; data: ZayavkaType };

/** Суммы расхода — без хвостов вида 0.30000000000000004, как у склада. */
const round = (n: number) => Number(n.toFixed(4));

/**
 * Несколько заявок → одна новая с именем.
 *
 * Порядок — по id, то есть по времени создания, а не по порядку выделения: так
 * результат не зависит от того, в какой последовательности тыкали в строки.
 *
 * - Материалы остаются по этапам, этапы идут подряд: сначала все этапы первой
 *   заявки, потом второй. К названию этапа дописан номер заявки — у двух заявок
 *   одной технологии этапы называются одинаково, и без него подряд шли бы два
 *   «Грунтования» непонятно откуда.
 * - Ручной инструмент складывается: шпатели одной бригады и шпатели другой — это
 *   разные шпатели.
 * - Электроинструмент берётся по максимуму, как при сведении этапов в расчёте
 *   (PowerToolList): перфоратор переходит с объекта на объект.
 *
 * system — общая технология, если она у всех одна; иначе перечень через запятую.
 * Он должен быть непустым: MaterialActionPanel без него лезет в route.params.system.
 */
export function mergeZayavki(sources: MergeSource[], name: string): ZayavkaType {
  const ordered = [...sources].sort((a, b) => a.id - b.id);

  const materials = ordered.flatMap(({ id, data }) =>
    (data.materials ?? []).map((stage) => ({
      ...stage,
      title: `${stage.title} (№${id})`,
    }))
  );

  const handTools = new Map<string, MergedHandTool>();
  const powerTools = new Map<string, PowerTool>();

  for (const { data } of ordered) {
    for (const tool of data.hand_tools ?? []) {
      const saved = handTools.get(tool.uniqKey);
      if (!saved) {
        handTools.set(tool.uniqKey, { ...tool });
        continue;
      }
      saved.adjusted_consumption = round(
        saved.adjusted_consumption + tool.adjusted_consumption
      );
      const descriptions = [
        ...(saved.descriptions ?? []),
        ...(tool.descriptions ?? []),
      ];
      if (descriptions.length) saved.descriptions = descriptions;
    }

    for (const tool of data.power_tools ?? []) {
      const key = tool.uniqKey || `${tool.id}:${tool.params.map((p) => p.id).join()}`;
      const saved = powerTools.get(key);
      if (!saved || saved.adjusted_consumption < tool.adjusted_consumption) {
        powerTools.set(key, { ...tool });
      }
    }
  }

  const systems = [
    ...new Set(ordered.map(({ data }) => data.system).filter(Boolean)),
  ];

  return {
    name,
    system: systems.join(", "),
    materials,
    hand_tools: [...handTools.values()],
    power_tools: [...powerTools.values()],
  };
}

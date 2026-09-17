import DictionaryModel from "@/models/DictionaryModel";
import NormsModel from "@/models/calc/NormsModel";

/**
 * Копия чужой общей технологии и её норм.
 *
 * Правку чужой технологии словарь применяет к копии: PATCH отвечает копией с новым
 * id и новыми этапами — с теми же позициями. Нормы расхода этапов живут в
 * calc-server, копия их не уносит, поэтому переносим сами, этап в этап.
 */

/** id этапа оригинала -> id этапа копии, сопоставлены по позиции. */
export async function mapCopyStages(
  sourceId: number,
  copyId: number,
): Promise<Map<number, number>> {
  const [source, copy] = await Promise.all([
    DictionaryModel.workStageTranslations(sourceId),
    DictionaryModel.workStageTranslations(copyId),
  ]);
  // Без этапов копии правка ушла бы в этапы оригинала — их не дадут править (403).
  if (!source || !copy) throw new Error("Этапы копии технологии не пришли");

  const byPosition = new Map(
    copy.items.map((stage) => [stage.position, stage.id]),
  );
  const stageIds = new Map<number, number>();
  for (const stage of source.items) {
    const copyStageId = byPosition.get(stage.position);
    if (copyStageId !== undefined) stageIds.set(stage.id, copyStageId);
  }
  return stageIds;
}

/**
 * Нормы этапов оригинала — на этапы копии. Скопированные пары удаляются из map:
 * упало посередине — повторный вызов доделает остальное, а calc-server и так не
 * задваивает уже перенесённое.
 */
export async function copyStageNorms(
  stageIds: Map<number, number>,
): Promise<void> {
  for (const [sourceStageId, copyStageId] of [...stageIds]) {
    await NormsModel.copyFrom(copyStageId, sourceStageId);
    stageIds.delete(sourceStageId);
  }
}

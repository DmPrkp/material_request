import DictionaryModel from "@/models/DictionaryModel";
import { useWorkTypesStore } from "@/store/workTypes";
import type { DictionarySystem } from "@/types/dto";

/**
 * Технологии вида работ по его коду из адреса — общее для плитки калькулятора
 * и для страницы группы.
 *
 * Возвращает null, когда грузить нечего или ответ устарел: словарь отдаёт имена
 * на языке запроса, и пока шёл ответ, язык могли сменить. Вызывающий в этом случае
 * оставляет на экране то, что было, — как везде, где get() глотает сетевую ошибку.
 */
export async function loadWorkTypeSystems(
  workTypeCode: string,
  locale: string
): Promise<DictionarySystem[] | null> {
  if (!workTypeCode) return null;

  const store = useWorkTypesStore();
  const workTypes = await store.load(locale);
  if (store.locale !== locale) return null;

  const workType = workTypes.find((item) => item.code === workTypeCode);
  if (!workType) return null;

  const page = await DictionaryModel.systems(workType.id);
  return page ? page.items : null;
}

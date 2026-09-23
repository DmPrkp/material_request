import { readFileSync } from 'node:fs';

import { getAllPages } from './http.mjs';

const DICT = '/dict/api/v1';

/**
 * Подписи единиц — те же, что пишет в заявку калькулятор (MaterialList переводит
 * measure через i18n перед сохранением). Берём из словаря клиента, чтобы не разойтись.
 */
function loadMeasureLabels() {
  try {
    const url = new URL('../../../ionic-client/src/plugins/i18n/locales/ru.json', import.meta.url);
    return JSON.parse(readFileSync(url, 'utf8')).measure ?? {};
  } catch {
    return {};
  }
}

/** Параметр сборки в той форме, в какой его отдаёт расчёт: param — значение, measure — единица, title — вид. */
const toCalcParam = (p) => ({
  id: p.paramValueId,
  param: p.value,
  measure: p.unit,
  ...(p.kind ? { title: p.kind } : {}),
});

async function variantsOf(api, resource, owners) {
  const result = [];
  for (const owner of owners) {
    const variants = await api.get(`${DICT}/${resource}/${owner.id}/variants`);
    for (const v of variants) {
      if (v.isActive) result.push({ owner, code: v.code, params: v.params.map(toCalcParam) });
    }
  }
  return result;
}

/**
 * Всё из словаря, на что ссылаются заявки и склады: коды сборок (материал, ручной
 * инструмент), id электроинструмента, технологии с этапами. Только общее и действующее —
 * аноним видит ровно это.
 */
export async function loadDictionary(api) {
  const measures = loadMeasureLabels();

  const [systems, stages, materials, handTools, powerTools] = await Promise.all([
    getAllPages(api, `${DICT}/systems`),
    getAllPages(api, `${DICT}/work-stages`),
    getAllPages(api, `${DICT}/materials`),
    getAllPages(api, `${DICT}/hand-tools`),
    getAllPages(api, `${DICT}/power-tools`),
  ]);

  const technologies = systems
    .map((system) => ({
      title: system.title,
      name: system.name,
      stages: stages
        .filter((s) => s.systemId === system.id)
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ id: s.id, name: s.name })),
    }))
    // Без этапов у заявки не будет материалов — такую технологию не берём.
    .filter((t) => t.stages.length);

  const materialVariants = (await variantsOf(api, 'materials', materials)).map(({ owner, code, params }) => ({
    code,
    id: owner.id,
    title: owner.name,
    description: owner.description ?? '',
    unit: owner.unit?.code ?? 'pcs',
    measure: measures[owner.unit?.code] ?? owner.unit?.name ?? 'шт',
    params,
  }));

  const handToolVariants = (await variantsOf(api, 'hand-tools', handTools)).map(({ owner, code, params }) => ({
    code,
    id: owner.id,
    title: owner.name,
    params,
  }));

  const powerToolItems = powerTools.map((t) => ({ id: t.id, title: t.name, corded: t.isCorded }));

  if (!technologies.length || !materialVariants.length || !handToolVariants.length || !powerToolItems.length) {
    throw new Error(
      'Словарь пуст или без этапов/сборок — заявки и склады не из чего собрать. Словарь поднят и засеян?',
    );
  }

  return { technologies, materialVariants, handToolVariants, powerTools: powerToolItems };
}

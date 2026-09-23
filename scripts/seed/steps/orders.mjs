import { objectName } from '../lib/fixtures.mjs';
import { consumption } from '../lib/amounts.mjs';

const ZAIAVKA = '/order/api/v1/zaiavka';

/**
 * Заявка в той форме, в какой её сохраняет калькулятор (ZaiavkaType на клиенте):
 * материалы по этапам технологии, инструмент уже сведён между этапами. uniqKey —
 * настоящие коды сборок из словаря, поэтому такую заявку можно и выгрузить, и
 * положить на склад.
 */
function randomZaiavka(random, dict) {
  const technology = random.pick(dict.technologies);
  const volume = random.int(5, 200) * 10;

  const materials = technology.stages.map((stage) => ({
    id: stage.id,
    title: stage.name,
    materials: random.sample(dict.materialVariants, random.int(2, 6)).map((m) => ({
      uniqKey: m.code,
      id: m.id,
      title: m.title,
      measure: m.measure,
      params: m.params,
      consumption: consumption(random, m.unit),
      volume,
      description: m.description,
    })),
  }));

  const hand_tools = random.sample(dict.handToolVariants, random.int(3, 8)).map((t) => ({
    uniqKey: t.code,
    id: t.id,
    title: t.title,
    adjusted_consumption: random.int(1, 6),
    params: t.params,
  }));

  // Ключ — как в PowerToolList: id и параметры, которых у электроинструмента нет.
  const power_tools = random.sample(dict.powerTools, random.int(1, 4)).map((t) => ({
    uniqKey: `${t.id}:`,
    id: t.id,
    title: t.title,
    adjusted_consumption: random.int(1, 3),
    corded: t.corded,
    params: [],
  }));

  const name = random.chance(0.3) ? objectName(random) : undefined;

  return { ...(name ? { name } : {}), system: technology.title, materials, hand_tools, power_tools };
}

/**
 * Заявка i — ownerOf(i) (seed.mjs). Повторный прогон досоздаёт недостающее: у
 * каждого автора берём столько его заявок, сколько уже есть, и пропускаем их.
 * Сравнивать содержимое незачем — метки «это сид» в заявке нет и не нужно.
 *
 * Аккаунтам из --join — ещё по perJoined сверх count: список заявок показывает только
 * свои, даже админу. Кто указан id, а не логином, идёт мимо nginx — orderApi
 * (resolveJoined в users.mjs).
 */
export async function ensureOrders(api, random, { count, ownerOf, joined, perJoined, orderApi, dict }) {
  const authors = Array.from({ length: count }, (_, i) => ownerOf(i));
  for (const user of joined) {
    for (let k = 0; k < perJoined; k++) authors.push(user);
  }

  const as = (user) =>
    user.headers ? { api: orderApi, opts: { headers: user.headers } } : { api, opts: { token: user.token } };

  const existing = new Map();
  for (const user of new Set(authors)) {
    const { api: via, opts } = as(user);
    existing.set(user.id, (await via.get(ZAIAVKA, opts)).length);
  }

  let created = 0;
  for (const author of authors) {
    // Случайное тянем всегда, даже если заявка уже есть, — иначе следующие разъедутся.
    const data = randomZaiavka(random, dict);
    const left = existing.get(author.id);
    if (left > 0) {
      existing.set(author.id, left - 1);
      continue;
    }
    const { api: via, opts } = as(author);
    await via.post(ZAIAVKA, data, opts);
    created++;
  }

  return { created };
}

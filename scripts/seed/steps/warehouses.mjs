import { ApiError } from '../lib/http.mjs';
import { address, warehouseName } from '../lib/fixtures.mjs';
import { stock } from '../lib/amounts.mjs';

const WAREHOUSES = '/warehouse/api/v1/warehouses';

// Каждый пятый склад — личный, остальные — компаний. Компаний берём меньше, чем складов,
// чтобы у части было по два склада: между ними работает «переместить».
const PERSONAL_EVERY = 5;
const COMPANY_SHARE = 0.6;

function randomItems(random, dict) {
  const materials = random.sample(dict.materialVariants, random.int(4, 8)).map((m) => ({
    kind: 'material',
    ref: m.code,
    quantity: stock(random, m.unit),
  }));
  const handTools = random.sample(dict.handToolVariants, random.int(2, 5)).map((t) => ({
    kind: 'hand_tool',
    ref: t.code,
    quantity: random.int(1, 12),
  }));
  const powerTools = random.sample(dict.powerTools, random.int(0, 3)).map((t) => ({
    kind: 'power_tool',
    ref: String(t.id),
    quantity: random.int(1, 4),
  }));
  return [...materials, ...handTools, ...powerTools];
}

async function findOwn(api, owner, name) {
  const page = await api.get(`${WAREHOUSES}?q=${encodeURIComponent(name)}&limit=200`, { token: owner.token });
  return page.items.find((w) => w.name === name && w.ownerId === owner.id && w.holderUserId === null);
}

/**
 * Склады с содержимым, назначенными участниками и выдачей «на руки».
 *
 * Содержимое кладём и выдаём только на только что заведённый склад: добавление
 * складывается с лежащим, и повторный прогон удвоил бы остатки. Назначение
 * идемпотентно (повторно — не ошибка), его делаем всегда.
 */
export async function ensureWarehouses(api, random, { count, ownerOf, companies, dict }) {
  const companyPool = companies.slice(0, Math.max(1, Math.ceil(companies.length * COMPANY_SHARE)));
  let created = 0;
  let items = 0;
  let issued = 0;

  for (let i = 0; i < count; i++) {
    const personal = i % PERSONAL_EVERY === PERSONAL_EVERY - 1;
    const company = personal ? null : companyPool[i % companyPool.length];
    // Личный — не тому же, кому компания с тем же индексом (при --spread).
    const owner = company ? company.owner : ownerOf(i * 7);
    const name = warehouseName(i);
    const auth = { token: owner.token };

    // Случайное тянем всегда, даже если склад уже есть, — иначе следующие разъедутся.
    const body = {
      name,
      address: address(random),
      description: random.chance(0.4) ? 'Демо-склад из scripts/seed' : '',
      companyId: company?.id ?? null,
    };
    const assignees = company ? random.sample(company.members, random.int(1, 3)).map((m) => m.user) : [];
    const contents = randomItems(random, dict);
    const issue = company && random.chance(0.4) ? { to: random.pick(company.members).user, n: random.int(1, 3) } : null;
    const partShares = contents.map(() => random.float(0.1, 0.5));

    let warehouse = await findOwn(api, owner, name);
    const isNew = !warehouse;
    if (isNew) {
      try {
        warehouse = await api.post(WAREHOUSES, body, auth);
        created++;
      } catch (err) {
        // Архивный тёзка у владельца: индекс уникальности только по действующим, так что
        // сюда попадём, лишь если склад успели завести параллельно, — берём его.
        if (!(err instanceof ApiError && err.status === 409)) throw err;
        warehouse = await findOwn(api, owner, name);
        if (!warehouse) throw err;
      }
    }

    // Аккаунты из --join — на все склады своих компаний: иначе в их списке складов пусто.
    for (const user of [...assignees, ...(company?.joined ?? [])]) {
      await api.put(`${WAREHOUSES}/${warehouse.id}/users/${user.id}`, undefined, auth);
    }

    if (!isNew) continue;

    const saved = await api.post(`${WAREHOUSES}/${warehouse.id}/items`, { items: contents }, auth);
    items += saved.length;

    if (issue) {
      // Выдаём часть: остаток остаётся на складе, как при выдаче со страницы склада.
      const takes = saved.slice(0, issue.n).map((row, k) => ({
        id: row.id,
        quantity:
          row.kind === 'material'
            ? Number(Math.max(1, row.quantity * partShares[k]).toFixed(0))
            : Math.max(1, Math.floor(row.quantity / 2)),
      }));
      await api.post(`${WAREHOUSES}/${warehouse.id}/items/issue`, { items: takes, userId: issue.to.id }, auth);
      issued += takes.length;
    }
  }

  return { created, items, issued };
}

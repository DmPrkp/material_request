#!/usr/bin/env node
/**
 * Демо-данные для user / company / warehouse / order: node scripts/seed/seed.mjs --help
 *
 * Всё идёт через HTTP API за nginx с настоящими токенами, а не SQL-ом в базы: так
 * соблюдаются правила сервисов (хеш пароля, роли в компании, назначение на склад только
 * участника, выдача на руки), и не нужно знать схему четырёх баз. Нужен поднятый стек
 * и засеянный словарь — из него берутся коды сборок для заявок и складов.
 */
import { parseArgs } from 'node:util';

import { createApi } from './lib/http.mjs';
import { createRandom } from './lib/random.mjs';
import { loadDictionary } from './lib/dictionary.mjs';
import { ensureUsers, resolveJoined } from './steps/users.mjs';
import { ensureCompanies } from './steps/companies.mjs';
import { ensureWarehouses } from './steps/warehouses.mjs';
import { ensureOrders } from './steps/orders.mjs';

const HELP = `
Наполнение баз демо-данными через API (стек должен быть поднят).

  node scripts/seed/seed.mjs [опции]

  --count N         сколько сущностей каждого вида (по умолчанию 30)
  --users N         пользователей (по умолчанию --count)
  --companies N     компаний
  --warehouses N    складов (без «рук» — они заводятся выдачей сверх этого числа)
  --orders N        заявок
  --only a,b        только эти шаги: companies, warehouses, orders
                    (пользователи — всегда: без токенов остальное не завести)
  --prefix demo     префикс логинов: demo01, demo02…; новый префикс — новый набор
  --spread          раздать владение по всем пользователям; без него компании, склады
                    и заявки — первого (demo01), остальные — участники и держатели
  --password demo123
  --seed 42         зерно генератора: тот же — те же связи при повторном прогоне
  --join 1,admin    существующие аккаунты (id или логин), чтобы видеть данные из своего:
                    управляющий в первых 5 компаниях, назначен на их склады и получает
                    свои заявки (список заявок показывает только свои, даже админу).
                    По id заявки идут мимо nginx в порт order-server — только dev
  --join-password P пароль для --join по логину (или $SEED_JOIN_PASSWORD)
  --join-orders 5   сколько заявок завести каждому такому аккаунту
  --order-url URL   order-server напрямую, для --join по id
                    (по умолчанию тот же хост, порт 4100)
  --base URL        адрес nginx (по умолчанию $SEED_BASE_URL или http://localhost)
  --allow-remote    разрешить не-локальный адрес (прод так засеять — плохая идея)

Повторный прогон с теми же опциями ничего не дублирует: находит своё и досоздаёт недостающее.
`;

const STEPS = ['companies', 'warehouses', 'orders'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'nginx']);

function parseOptions() {
  const { values } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
      count: { type: 'string', default: '30' },
      users: { type: 'string' },
      companies: { type: 'string' },
      warehouses: { type: 'string' },
      orders: { type: 'string' },
      only: { type: 'string' },
      prefix: { type: 'string', default: 'demo' },
      password: { type: 'string', default: 'demo123' },
      seed: { type: 'string', default: '42' },
      join: { type: 'string', default: '' },
      'join-password': { type: 'string', default: process.env.SEED_JOIN_PASSWORD || '' },
      'join-orders': { type: 'string', default: '5' },
      'order-url': { type: 'string' },
      base: { type: 'string', default: process.env.SEED_BASE_URL || 'http://localhost' },
      'allow-remote': { type: 'boolean', default: false },
      spread: { type: 'boolean', default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  const int = (name, raw, min) => {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min) throw new Error(`--${name}: целое не меньше ${min}`);
    return n;
  };
  const count = int('count', values.count, 1);
  const only = values.only ? values.only.split(',').map((s) => s.trim()) : STEPS;
  const unknown = only.filter((s) => !STEPS.includes(s));
  if (unknown.length) throw new Error(`--only: неизвестные шаги ${unknown.join(', ')}`);

  const base = new URL(values.base);
  if (!LOCAL_HOSTS.has(base.hostname) && !values['allow-remote']) {
    throw new Error(`${base.origin} — не локальный адрес. Нужен именно он — добавьте --allow-remote`);
  }

  // Изнутри сети compose адрес nginx — «nginx», а сервиса — имя его контейнера.
  const orderHost = base.hostname === 'nginx' ? 'order-server' : base.hostname;

  return {
    base: base.origin,
    orderUrl: values['order-url'] || `http://${orderHost}:4100`,
    users: int('users', values.users ?? count, 1),
    companies: int('companies', values.companies ?? count, 0),
    warehouses: int('warehouses', values.warehouses ?? count, 0),
    orders: int('orders', values.orders ?? count, 0),
    only: new Set(only),
    prefix: values.prefix,
    password: values.password,
    seed: int('seed', values.seed, 0),
    spread: values.spread,
    join: values.join ? values.join.split(',').map((s) => s.trim().toLowerCase()) : [],
    joinPassword: values['join-password'],
    joinOrders: int('join-orders', values['join-orders'], 0),
  };
}

async function main() {
  const opts = parseOptions();
  const api = createApi(opts.base);
  // У каждого шага свой поток случайного: --only orders даёт те же заявки, что полный прогон.
  const randomFor = (step) => createRandom(opts.seed * 1000 + STEPS.indexOf(step));

  console.log(`→ ${opts.base}, логины ${opts.prefix}01…, пароль ${opts.password}`);

  const { users, created: usersCreated } = await ensureUsers(api, {
    count: opts.users,
    prefix: opts.prefix,
    password: opts.password,
  });
  console.log(`  пользователи: ${users.length} (новых ${usersCreated})`);

  // Без --spread всё на одном: зашёл под ним — и видишь все демо-данные сразу, а не
  // по кусочку у каждого (списки складов и заявок показывают только своё).
  const ownerOf = (i) => (opts.spread ? users[i % users.length] : users[0]);

  const joined = await resolveJoined(api, opts.join, opts.joinPassword);
  for (const user of joined) {
    const who = user.login ? `${user.login} (id ${user.id})` : `id ${user.id} через ${opts.orderUrl}`;
    console.log(`  --join ${who}`);
  }

  const needDict = opts.only.has('warehouses') || opts.only.has('orders');
  const dict = needDict ? await loadDictionary(api) : null;
  if (dict) {
    console.log(
      `  словарь: технологий ${dict.technologies.length}, сборок материалов ${dict.materialVariants.length}, ` +
        `ручного инструмента ${dict.handToolVariants.length}, электроинструмента ${dict.powerTools.length}`,
    );
  }

  // Складам нужны компании — заводим (или находим) их и при --only warehouses.
  let companies = [];
  if (opts.only.has('companies') || opts.only.has('warehouses')) {
    const res = await ensureCompanies(api, randomFor('companies'), {
      count: opts.companies,
      users,
      ownerOf,
      join: joined,
    });
    companies = res.companies;
    console.log(`  компании: ${companies.length} (новых ${res.created})`);
  }

  if (opts.only.has('warehouses')) {
    const res = await ensureWarehouses(api, randomFor('warehouses'), {
      count: opts.warehouses,
      ownerOf,
      companies,
      dict,
    });
    console.log(
      `  склады: ${opts.warehouses} (новых ${res.created}), позиций положено ${res.items}, выдано на руки ${res.issued}`,
    );
  }

  if (opts.only.has('orders')) {
    const res = await ensureOrders(api, randomFor('orders'), {
      count: opts.orders,
      ownerOf,
      joined,
      perJoined: opts.joinOrders,
      orderApi: createApi(opts.orderUrl),
      dict,
    });
    const extra = joined.length ? ` + ${joined.length * opts.joinOrders} для --join` : '';
    console.log(`  заявки: ${opts.orders}${extra} (новых ${res.created})`);
  }

  const who = opts.spread ? '' : ' — владелец всех демо-данных';
  console.log(`Готово. Вход: ${users[0].login} / ${opts.password}${who}`);
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});

import { z } from 'zod';

import type { AuthUser } from '~/auth/auth-user';

import { withItemNames } from './item-names';
import type { ServiceClient, ServiceResult } from './service-client';

/**
 * Что ассистент умеет. Чтение выполняется сразу, **запись — только после подтверждения**
 * пользователя (`write: true`, см. ChatService): модель может ошибиться или поддаться
 * инструкции из чужого текста, а заявки и склады необратимо менять нельзя.
 *
 * Новое умение — одна запись в TOOLS. Список намеренно короткий и по именам: ассистент не
 * получает «ходи куда хочешь», только то, что здесь перечислено.
 */
export type Tool<S extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  write: boolean;
  schema: S;
  /** Что увидит пользователь в запросе подтверждения — по аргументам, без участия модели. */
  summary: (args: z.infer<S>) => string;
  run: (client: ServiceClient, user: AuthUser, args: z.infer<S>) => Promise<ServiceResult>;
};

function tool<S extends z.ZodType>(definition: Tool<S>): Tool {
  return definition;
}

const id = z.number().int().positive();
const query = z.object({ q: z.string().min(1).max(100).describe('Строка поиска') });
const search = (q: string) => `?q=${encodeURIComponent(q)}&limit=20`;

export const TOOLS: Tool[] = [
  tool({
    name: 'list_zayavki',
    description: 'Список заявок пользователя (только его собственные).',
    write: false,
    schema: z.object({}),
    summary: () => 'Список заявок',
    run: async (c, u) => {
      const result = await c.request(u, 'order', 'GET', '/zayavka');
      return result.ok ? { ...result, body: summarizeZayavki(result.body) } : result;
    },
  }),
  tool({
    name: 'get_zayavka',
    description: 'Одна заявка целиком: материалы, инструмент, объёмы.',
    write: false,
    schema: z.object({ id }),
    summary: (a) => `Заявка №${a.id}`,
    run: (c, u, a) => c.request(u, 'order', 'GET', `/zayavka/${a.id}`),
  }),
  tool({
    name: 'list_warehouses',
    description: 'Склады, доступные пользователю.',
    write: false,
    schema: z.object({}),
    summary: () => 'Список складов',
    run: (c, u) => c.request(u, 'warehouse', 'GET', '/warehouses'),
  }),
  tool({
    name: 'list_warehouse_items',
    description: 'Содержимое склада: позиции (name — название, params — параметры) и остатки (quantity).',
    write: false,
    schema: z.object({ warehouseId: id }),
    summary: (a) => `Содержимое склада №${a.warehouseId}`,
    run: async (c, u, a) =>
      withItemNames(c, u, await c.request(u, 'warehouse', 'GET', `/warehouses/${a.warehouseId}/items`)),
  }),
  tool({
    name: 'find_in_stock',
    description:
      'Найти позицию по названию (например «перфоратор») на всех складах пользователя: где она и сколько. Для вопросов «сколько у меня…», «где лежит…».',
    write: false,
    schema: query,
    summary: (a) => `Поиск «${a.q}» по складам`,
    run: (c, u, a) => findInStock(c, u, a.q),
  }),
  tool({
    name: 'my_holdings',
    description: 'Что у пользователя «на руках».',
    write: false,
    schema: z.object({}),
    summary: () => 'Что на руках',
    run: async (c, u) => withItemNames(c, u, await c.request(u, 'warehouse', 'GET', '/holdings/mine')),
  }),
  tool({
    name: 'list_companies',
    description: 'Компании пользователя и его роли в них.',
    write: false,
    schema: z.object({}),
    summary: () => 'Список компаний',
    run: (c, u) => c.request(u, 'company', 'GET', '/companies'),
  }),
  tool({
    name: 'search_materials',
    description: 'Поиск материалов в справочнике по названию.',
    write: false,
    schema: query,
    summary: (a) => `Поиск материалов «${a.q}»`,
    run: (c, u, a) => c.request(u, 'dict', 'GET', `/materials${search(a.q)}`),
  }),
  tool({
    name: 'search_systems',
    description: 'Поиск технологий работ (перегородки, кровля, фасад…) в справочнике.',
    write: false,
    schema: query,
    summary: (a) => `Поиск технологий «${a.q}»`,
    run: (c, u, a) => c.request(u, 'dict', 'GET', `/systems${search(a.q)}`),
  }),
  tool({
    name: 'create_zayavka',
    description:
      'Создать заявку от имени пользователя. body — состав заявки в том же виде, в каком его возвращает get_zayavka.',
    write: true,
    schema: z.object({ body: z.record(z.string(), z.unknown()) }),
    summary: (a) => `Создать заявку${typeof a.body.name === 'string' ? ` «${a.body.name}»` : ''}`,
    run: (c, u, a) => c.request(u, 'order', 'POST', '/zayavka', a.body),
  }),
  tool({
    name: 'update_zayavka',
    description:
      'Заменить заявку целиком (PUT): сначала прочитай её get_zayavka, поменяй нужное и пришли весь body.',
    write: true,
    schema: z.object({ id, body: z.record(z.string(), z.unknown()) }),
    summary: (a) => `Изменить заявку №${a.id}`,
    run: (c, u, a) => c.request(u, 'order', 'PUT', `/zayavka/${a.id}`, a.body),
  }),
  tool({
    name: 'delete_zayavka',
    description: 'Удалить заявку.',
    write: true,
    schema: z.object({ id }),
    summary: (a) => `Удалить заявку №${a.id}`,
    run: (c, u, a) => c.request(u, 'order', 'DELETE', `/zayavka/${a.id}`),
  }),
];

/**
 * В списке заявка — это весь состав строкой в `data` (десятки КБ), и в контекст модели
 * влезли бы две-три. Для обзора хватает шапки; состав модель дочитает через get_zayavka.
 */
export function summarizeZayavki(body: unknown): unknown {
  if (!Array.isArray(body)) return body;
  return body.map((row: { id?: number; data?: unknown; createdAt?: string; updatedAt?: string }) => {
    let data: {
      system?: string;
      name?: string;
      materials?: unknown[];
      hand_tools?: unknown[];
      power_tools?: unknown[];
    } = {};
    try {
      data = typeof row.data === 'string' ? JSON.parse(row.data) : {};
    } catch {
      // битый data — отдадим шапку без состава
    }
    return {
      id: row.id,
      system: data.system,
      name: data.name,
      stages: data.materials?.length,
      handTools: data.hand_tools?.length,
      powerTools: data.power_tools?.length,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

/** Складов у человека обычно единицы; потолок защищает от сотни запросов на один вопрос. */
const MAX_WAREHOUSES = 50;

/**
 * Один вопрос «сколько у меня перфораторов» без этого — обход всех складов по одному вызовом
 * модели за каждый: медленно и упирается в лимит шагов. Название в складе не хранится (только
 * ссылка), поэтому сперва подставляем имена, потом фильтруем.
 */
async function findInStock(c: ServiceClient, u: AuthUser, q: string): Promise<ServiceResult> {
  const list = await c.request(u, 'warehouse', 'GET', `/warehouses?limit=${MAX_WAREHOUSES}`);
  const warehouses = (list.body as { items?: { id: number; name: string }[] } | null)?.items;
  if (!list.ok || !warehouses) return list;

  const needle = q.trim().toLowerCase();
  const found: unknown[] = [];
  const rows = await Promise.all(
    warehouses.map(async (w) => ({
      w,
      res: await withItemNames(c, u, await c.request(u, 'warehouse', 'GET', `/warehouses/${w.id}/items`)),
    })),
  );
  for (const { w, res } of rows) {
    for (const item of (res.ok && Array.isArray(res.body) ? res.body : []) as {
      name?: string;
      params?: string;
      quantity?: number;
      kind?: string;
    }[]) {
      if (item.name?.toLowerCase().includes(needle)) {
        found.push({
          warehouseId: w.id,
          warehouse: w.name,
          kind: item.kind,
          name: item.name,
          params: item.params,
          quantity: item.quantity,
        });
      }
    }
  }
  return { ok: true, status: 200, body: found };
}

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

/** Формат function calling OpenAI-совместимого API. */
export function toolDefinitions() {
  return TOOLS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.write ? `${t.description} Требует подтверждения пользователя.` : t.description,
      parameters: z.toJSONSchema(t.schema),
    },
  }));
}

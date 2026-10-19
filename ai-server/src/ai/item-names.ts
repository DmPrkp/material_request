import type { AuthUser } from '~/auth/auth-user';

import type { ServiceClient, ServiceResult } from './service-client';

type Item = { kind?: string; ref?: string; [key: string]: unknown };
type Variant = {
  code: string;
  owner?: { name?: string };
  params?: { kind?: string; value?: string; unit?: string }[];
};

/**
 * Склад хранит позиции ссылками — `kind` + `ref` (код сборки или id электроинструмента), без
 * названий: межбазовых связей нет (CLAUDE.md). Модель видела `power_tool 16` и честно отвечала
 * «перфораторов не нашла», потому что никак не могла узнать, что 16 — это перфоратор. Названия
 * подставляем здесь, а не просим модель дёргать справочник на каждую строку: дольше, дороже и
 * ненадёжнее.
 *
 * Сбой справочника не ломает ответ: вернём позиции как есть.
 */
export async function withItemNames(
  client: ServiceClient,
  user: AuthUser,
  result: ServiceResult,
): Promise<ServiceResult> {
  if (!result.ok) return result;
  const list = Array.isArray(result.body) ? result.body : (result.body as { items?: unknown })?.items;
  if (!Array.isArray(list)) return result;
  const items = list as Item[];

  try {
    const names = await lookupNames(client, user, items);
    const named = items.map((item) => {
      const found = item.kind && item.ref ? names.get(`${item.kind}:${item.ref}`) : undefined;
      return found ? { ...item, ...found } : item;
    });
    return {
      ...result,
      body: Array.isArray(result.body) ? named : { ...(result.body as object), items: named },
    };
  } catch {
    return result;
  }
}

async function lookupNames(client: ServiceClient, user: AuthUser, items: Item[]) {
  const names = new Map<string, { name: string; params?: string }>();
  const refs = (kind: string) => [
    ...new Set(items.filter((i) => i.kind === kind && i.ref).map((i) => i.ref!)),
  ];

  const variants = async (kind: 'material' | 'hand_tool', path: string) => {
    const codes = refs(kind);
    if (!codes.length) return;
    const res = await client.request(
      user,
      'dict',
      'GET',
      `${path}?codes=${encodeURIComponent(codes.join(','))}`,
    );
    if (!res.ok || !Array.isArray(res.body)) return;
    for (const v of res.body as Variant[]) {
      if (!v.owner?.name) continue;
      const params = v.params?.map((p) => `${p.kind} ${Number(p.value)} ${p.unit ?? ''}`.trim()).join(', ');
      names.set(`${kind}:${v.code}`, { name: v.owner.name, ...(params ? { params } : {}) });
    }
  };

  const powerTools = async () => {
    if (!refs('power_tool').length) return;
    // Справочник небольшой (десятки позиций), а точечного поиска по id для списка нет.
    const res = await client.request(user, 'dict', 'GET', '/power-tools?limit=200');
    const rows = (res.body as { items?: { id: number; name: string }[] } | null)?.items;
    if (!res.ok || !rows) return;
    for (const t of rows) names.set(`power_tool:${t.id}`, { name: t.name });
  };

  await Promise.all([
    variants('material', '/material-variants'),
    variants('hand_tool', '/hand-tool-variants'),
    powerTools(),
  ]);
  return names;
}

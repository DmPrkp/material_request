/**
 * Заявки без входа лежат на сервере ничьими, а браузер помнит только их id и ключ
 * правки: по нему order-server пускает PUT и отдаёт заявку вошедшему (POST /zaiavka/claim).
 * Сама заявка здесь не хранится — почистят данные сайта, пропадёт только право правки,
 * а по ссылке заявка останется.
 */
const STORAGE_KEY = "mr-zaiavka-keys";

export type AnonymousKey = { id: number; key: string };

/** Хранилище может быть недоступно (приватный режим, запрет сайта) — тогда ключей просто нет. */
export function listKeys(): AnonymousKey[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeKeys(keys: AnonymousKey[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (error) {
    console.error("Не удалось запомнить ключ заявки", error);
  }
}

export function findKey(id: number): string | undefined {
  return listKeys().find((item) => item.id === id)?.key;
}

export function addKey(id: number, key: string) {
  writeKeys([...listKeys().filter((item) => item.id !== id), { id, key }]);
}

export function removeKeys(ids: number[]) {
  writeKeys(listKeys().filter((item) => !ids.includes(item.id)));
}

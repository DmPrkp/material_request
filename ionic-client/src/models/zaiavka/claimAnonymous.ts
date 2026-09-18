import Zaiavka from "./index";
import { listKeys, removeKeys } from "./anonymousKeys";

let claiming: Promise<void> | undefined;

/**
 * После входа забираем ничьи заявки этого браузера себе. Ключи забываем все
 * отправленные: те, что сервер не отдал (удалены чисткой, уже чьи-то), больше
 * ничего не открывают. Нет сети — ключи остаются до следующего входа.
 * Параллельные вызовы ждут один запрос.
 */
export function claimAnonymous(): Promise<void> {
  if (!claiming) {
    claiming = (async () => {
      const items = listKeys();
      if (!items.length) return;
      try {
        await Zaiavka.claim(items);
        removeKeys(items.map((item) => item.id));
      } catch (error) {
        console.error("Не удалось перенести заявки в аккаунт", error);
      }
    })().finally(() => {
      claiming = undefined;
    });
  }
  return claiming;
}

import type { RouteLocationNormalized } from "vue-router";

/** Счётчик Яндекс Метрики — тот же номер, что в index.html. */
export const METRIKA_ID = 114052526;

type Ym = (id: number, method: "hit", url: string, options?: object) => void;

/**
 * Просмотр страницы внутри SPA: init в index.html засчитывает только первую загрузку,
 * а дальше адрес меняет роутер без перезагрузки — без hit Метрика видела бы у
 * каждого посетителя одну страницу. Первый заход (from без matched — стартовая
 * навигация) пропускаем: его уже отправил init. ym нет вне прода (index.html грузит
 * счётчик только на zayavka.app) — тогда ничего не делаем.
 */
export function trackPageView(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) {
  const ym = (window as unknown as { ym?: Ym }).ym;
  if (!ym || !from.matched.length || to.fullPath === from.fullPath) return;
  const { origin } = window.location;
  ym(METRIKA_ID, "hit", origin + to.fullPath, {
    referer: origin + from.fullPath,
    title: document.title,
  });
}

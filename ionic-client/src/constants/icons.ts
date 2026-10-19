/*
 * Иконки, которых нет в ionicons. Формат тот же, что у самого ionicons: data-URI с
 * svg и currentColor, поэтому годятся в `<ion-icon :icon="...">` и красятся темой.
 * Контурный стиль — штрих 32 на сетке 512, как у остальных иконок приложения.
 */
export const robotOutline =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'>" +
  "<rect x='96' y='168' width='320' height='248' rx='48' fill='none' stroke='currentColor' stroke-linejoin='round' stroke-width='32'/>" +
  "<path d='M256 168V100' fill='none' stroke='currentColor' stroke-linecap='round' stroke-width='32'/>" +
  "<circle cx='256' cy='76' r='20' fill='currentColor'/>" +
  "<circle cx='192' cy='272' r='24' fill='currentColor'/>" +
  "<circle cx='320' cy='272' r='24' fill='currentColor'/>" +
  "<path d='M192 352h128' fill='none' stroke='currentColor' stroke-linecap='round' stroke-width='32'/>" +
  "<path d='M64 256v96M448 256v96' fill='none' stroke='currentColor' stroke-linecap='round' stroke-width='32'/>" +
  "</svg>";

/**
 * Виды работ калькулятора — плитка на /:locale/zayavka/calculator.
 *
 * Здесь только то, чего нет в словаре: снимок раздела и флаг «в разработке».
 * Технологии внутри вида работ не перечисляются — их отдаёт словарь
 * (SystemsPage), иначе каждая новая требовала бы правки клиента, а заведённая
 * пользователем не появилась бы вовсе.
 */
const FACADE_MENU = {
  id: 1,
  title: "facade",
  description: "facade items",
  img: {
    src: "/main-menu/facade-main-narrow.jpg",
    alt: "facade-main",
    width: 150,
  },
};

const ROOF_MENU = {
  id: 2,
  title: "roof",
  description: "roof items",
  img: {
    src: "/main-menu/roof-main-narrow.jpg",
    alt: "roof-main",
    width: 150,
  },
  // Технологий кровли в словаре пока нет — раздел закрыт.
  disable: true,
};

const INTERIOR_MENU = {
  id: 3,
  title: "interior",
  description: "interior items",
  img: {
    src: "/main-menu/interior-main-narrow.jpg",
    alt: "interior-main",
    width: 150,
  },
};

export const MAIN_MENU = [FACADE_MENU, ROOF_MENU, INTERIOR_MENU];

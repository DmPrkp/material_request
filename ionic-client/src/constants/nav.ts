import {
  libraryOutline,
  calculatorOutline,
  documentsOutline,
  archiveOutline,
  logInOutline,
  businessOutline,
  settingsOutline,
} from "ionicons/icons";

/*
 * Разделы приложения: нижняя полоса и боковое меню берут их отсюда, чтобы
 * ссылки и иконки не разъехались между ними.
 */
export const CATALOG = {
  link: "catalog",
  name: "catalog",
  icon: libraryOutline,
};
export const CALCULATOR = {
  link: "calculator",
  name: "calculator",
  icon: calculatorOutline,
};
export const ZAYAVKA = {
  link: "zayavka",
  name: "zayavka",
  icon: documentsOutline,
};
export const WAREHOUSES = {
  link: "warehouses",
  name: "warehouses",
  icon: archiveOutline,
};
export const COMPANIES = {
  link: "companies",
  name: "companies",
  icon: businessOutline,
};
export const SETTINGS = {
  link: "settings",
  name: "settings",
  icon: settingsOutline,
};
export const AUTH = {
  link: "auth",
  name: "auth",
  icon: logInOutline,
};

/** id бокового меню в шапке: открыть и закрыть его можно только по нему. */
export const MAIN_MENU_ID = "main-menu";

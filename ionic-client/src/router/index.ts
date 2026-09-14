import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import { useHead } from "@vueuse/head";
import { Locale } from "@/types";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  resolveInitialLocale,
  setI18nLocale,
} from "@/plugins/i18n";
import { normalizeCatalogTab } from "@/constants";
import { defaultKeys, routeMeta } from "./constants";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: () => `/${resolveInitialLocale()}/main`,
  },
  {
    path: "/:locale",
    redirect: (to) => `${to.path}/main`,
    component: {
      template: "<router-view />",
    },
    children: [
      {
        // Сборники устроены как главная: плитка разделов, каждый — свой адрес.
        path: "catalog",
        name: "catalog",
        component: () => import("@/pages/CatalogPage.vue"),
        meta: { requiresAuth: true },
        children: [
          {
            // Статический сегмент выигрывает у :tab при разборе адреса. Отдельная
            // страница, а не ещё одна вкладка CATALOG_TABS: тут не плоский список
            // позиций, а системы с этапами и формы добавления.
            path: "systems",
            name: "catalog-systems",
            component: () => import("@/pages/CatalogSystemsPage.vue"),
            meta: { requiresAuth: true },
            children: [
              {
                // code вида работ из словаря (facade, roof, interior…), а не
                // фиксированный список: новые виды заводятся без правки роутера.
                path: ":workType",
                name: "catalog-work-type",
                component: () => import("@/pages/CatalogTechnologiesPage.vue"),
                meta: { requiresAuth: true },
              },
            ],
          },
          {
            path: ":tab",
            name: "catalog-section",
            component: () => import("@/pages/CatalogSectionPage.vue"),
            meta: { requiresAuth: true },
            // Неизвестный раздел в адресе -> обратно в меню сборников.
            beforeEnter: (to) =>
              normalizeCatalogTab(to.params.tab)
                ? true
                : { name: "catalog", params: { locale: to.params.locale } },
          },
        ],
      },
      {
        // Из нижнего меню убрана в пользу «сборников», но роут оставлен —
        // страница доступна по прямой ссылке.
        path: "about",
        name: "about",
        component: () => import("@/pages/AboutPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "auth",
        name: "auth",
        component: () => import("@/pages/AuthPage.vue"),
        meta: { requiresAuth: false },
      },
      {
        path: "main",
        name: "main",
        component: () => import("@/pages/MainPage.vue"),
        meta: { requiresAuth: true },
        children: [
          {
            path: ":workType",
            name: "work-type",
            component: () => import("@/pages/SystemsPage.vue"),
            meta: { requiresAuth: true },
            children: [
              {
                path: ":system",
                name: "system",
                component: () => import("@/pages/ComponentsPage.vue"),
                meta: { requiresAuth: true },
                children: [
                  {
                    path: "materialList",
                    name: "material-list",
                    component: () => import("@/pages/MaterialListPage.vue"),
                    meta: { requiresAuth: true },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: "zaiavka",
        name: "zaiavka-list",
        component: () => import("@/pages/ZaiavkaListPage.vue"),
        meta: { requiresAuth: true },
        children: [
          {
            path: ":zaiavka",
            name: "zaiavka",
            component: () => import("@/pages/ZaiavkaPage.vue"),
            meta: { requiresAuth: true },
          },
        ],
      },
      {
        // Пока заглушка: раздел заведён в нижнем меню заранее.
        path: "warehouses",
        name: "warehouses",
        component: () => import("@/pages/WarehousesPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        // Настройки теперь модалка из аватара в шапке, а не страница. Адрес
        // оставлен редиректом: /ru/settings был в sitemap и мог осесть в закладках.
        path: "settings",
        redirect: (to) => `/${to.params.locale}/main`,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes,
});

/**
 * Локаль живёт в URL (/:locale/...). Гвард догружает нужный словарь и
 * синхронизирует локаль с i18n, а неизвестный сегмент заменяет на поддерживаемый.
 */
router.beforeEach(async (to) => {
  const locale = normalizeLocale(to.params.locale);

  if (!locale) {
    const fallback = resolveInitialLocale();
    const segments = to.fullPath.split("/");
    segments[1] = fallback;
    return segments.join("/") || `/${fallback}/main`;
  }

  await setI18nLocale(locale);
  return true;
});

router.afterEach((to) => {
  const locale = (normalizeLocale(to.params.locale) ||
    DEFAULT_LOCALE) as Locale;

  const currentRoute = to.path.split("/").slice(2, 5).join("/");
  const keywords =
    routeMeta[currentRoute]?.key?.[locale] || defaultKeys[locale];

  document.documentElement.lang = locale;

  useHead({
    meta: [
      {
        name: "description",
        content: defaultKeys[locale],
      },
      {
        name: "keywords",
        content: keywords,
      },
    ],
  });
});

export default router;

import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw, RouterView } from "vue-router";
import { Locale } from "@/types";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  resolveInitialLocale,
  setI18nLocale,
} from "@/plugins/i18n";
import {
  DEFAULT_POWER_TOOL_CURRENT,
  POWER_TOOL_CURRENTS,
  normalizeCatalogTab,
} from "@/constants";
import { applySeo } from "./seo";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    // Стартовая — главная (/:locale/main): корень сайта поисковик считает самой
    // сильной страницей, и вести он должен на описание приложения, а не на личный
    // список заявок. На проде «/» отвечает редиректом ещё nginx клиента
    // (docker/nginx.conf) — робот получает его без JS; этот — для dev и переходов.
    redirect: () => `/${resolveInitialLocale()}/main`,
  },
  {
    path: "/:locale",
    redirect: (to) => `${to.path.replace(/\/$/, "")}/main`,
    // Сам RouterView, а не { template: "<router-view />" }: строковый шаблон требовал
    // полной сборки Vue с компилятором шаблонов (~60 КБ в главном чанке).
    component: RouterView,
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
                children: [
                  {
                    // id технологии или new — добавление. В sitemap не идут:
                    // адреса — записи словаря, у каждого пользователя свои.
                    path: ":systemId(\\d+|new)",
                    name: "catalog-technology",
                    component: () =>
                      import("@/pages/CatalogTechnologyPage.vue"),
                    meta: { requiresAuth: true },
                    children: [
                      {
                        path: "stages/:stageId(\\d+)",
                        name: "catalog-stage",
                        component: () => import("@/pages/CatalogStagePage.vue"),
                        meta: { requiresAuth: true },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            // Электроинструмент делится по питанию, и таб — тоже адрес. Литерал
            // в :tab(power_tools) оставляет params.tab: по нему страница узнаёт
            // раздел так же, как на обычном :tab. Чужой таб роут не совпадёт.
            path: `:tab(power_tools)/:current(${POWER_TOOL_CURRENTS.join("|")})`,
            name: "catalog-power-tools",
            component: () => import("@/pages/CatalogSectionPage.vue"),
            meta: { requiresAuth: true },
          },
          {
            path: ":tab",
            name: "catalog-section",
            component: () => import("@/pages/CatalogSectionPage.vue"),
            meta: { requiresAuth: true },
            beforeEnter: (to) => {
              const tab = normalizeCatalogTab(to.params.tab);
              // Неизвестный раздел в адресе -> обратно в меню сборников.
              if (!tab) {
                return {
                  name: "catalog",
                  params: { locale: to.params.locale },
                };
              }
              // Голый /power_tools (он же в sitemap и в плитке меню) — на первый таб.
              if (tab === "power_tools") {
                return {
                  name: "catalog-power-tools",
                  params: {
                    locale: to.params.locale,
                    tab,
                    current: DEFAULT_POWER_TOOL_CURRENT,
                  },
                };
              }
              return true;
            },
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
        path: "auth/forgot",
        name: "auth-forgot",
        component: () => import("@/pages/AuthForgotPage.vue"),
        meta: { requiresAuth: false },
      },
      {
        // Сюда приходят по ссылке из письма, из почтового клиента и обычно без входа —
        // поэтому requiresAuth: false и обе страницы в NOINDEX_ROUTES.
        path: "auth/verify",
        name: "auth-verify",
        component: () => import("@/pages/AuthVerifyPage.vue"),
        meta: { requiresAuth: false },
      },
      {
        path: "auth/reset",
        name: "auth-reset",
        component: () => import("@/pages/AuthResetPage.vue"),
        meta: { requiresAuth: false },
      },
      {
        // Главная: что это и сценарии со скриншотами. Калькулятор — свой раздел.
        path: "main",
        name: "main",
        component: () => import("@/pages/MainPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        // Старые адреса калькулятора были в sitemap и в закладках, и ими делились
        // (materialList с объёмами в query) — переводим в новый, query сохраняем.
        path: "main/:calcPath(.+)",
        redirect: (to) => ({
          path: to.path.replace(/^\/([^/]+)\/main\//, "/$1/calculator/"),
          query: to.query,
        }),
      },
      {
        // Второй переезд калькулятора — из «Заявок» в свой раздел. Эти адреса тоже
        // успели побывать в sitemap и в ссылках, поэтому переводим и их. Параметр
        // сразу после статического текста ловит и голый /zayavka/calculator, и всё,
        // что под ним.
        path: "zayavka/calculator:calcPath(.*)",
        redirect: (to) => ({
          path: to.path.replace(
            /^\/([^/]+)\/zayavka\/calculator/,
            "/$1/calculator",
          ),
          query: to.query,
        }),
      },
      {
        // Расчёт — свой раздел, а не шаг внутри «Заявок»: считают и без заявки, а
        // попасть в калькулятор можно было только из списка. Кнопка «Новая заявка»
        // по-прежнему ведёт сюда, и расчёт по-прежнему сохраняется заявкой.
        path: "calculator",
        name: "calculator",
        component: () => import("@/pages/CalculatorPage.vue"),
        meta: { requiresAuth: true },
        children: [
          {
            path: ":workType",
            name: "work-type",
            component: () => import("@/pages/SystemsPage.vue"),
            meta: { requiresAuth: true },
            children: [
              {
                // Группа технологий — шаг навигации внутри вида работ
                // («Перегородки» → «Гипсокартон»). Статический сегмент group
                // не даёт спутать код группы с техническим кодом технологии,
                // а сама технология остаётся на прежнем адресе — sitemap,
                // SEO-ключи и старые ссылки не трогаем. Состав групп —
                // в constants/systems.
                path: "group/:group",
                name: "system-group",
                component: () => import("@/pages/SystemGroupPage.vue"),
                meta: { requiresAuth: true },
              },
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
        path: "zayavka",
        name: "zayavka-list",
        component: () => import("@/pages/ZayavkaListPage.vue"),
        meta: { requiresAuth: true },
        children: [
          {
            path: ":zayavka(\\d+)",
            name: "zayavka",
            component: () => import("@/pages/ZayavkaPage.vue"),
            meta: { requiresAuth: true },
          },
        ],
      },
      {
        path: "warehouses",
        name: "warehouses",
        component: () => import("@/pages/WarehousesPage.vue"),
        meta: { requiresAuth: true },
        children: [
          {
            // Второй таб складов: кому что выдано. Таб — адрес, как питание в каталоге.
            path: "holdings",
            name: "holdings",
            component: () => import("@/pages/HoldingsPage.vue"),
            meta: { requiresAuth: true },
            children: [
              {
                // Что у меня на руках; как и склады, в sitemap не идёт.
                path: "mine",
                name: "on-hand",
                component: () => import("@/pages/OnHandPage.vue"),
                meta: { requiresAuth: true },
              },
            ],
          },
          {
            // Склады — свои у каждого, в sitemap не идут.
            path: ":warehouse(\\d+)",
            name: "warehouse",
            component: () => import("@/pages/WarehousePage.vue"),
            meta: { requiresAuth: true },
          },
        ],
      },
      {
        // Настройки теперь модалка из аватара в шапке, а не страница. Адрес
        // оставлен редиректом: /ru/settings был в sitemap и мог осесть в закладках.
        path: "settings",
        redirect: (to) => `/${to.params.locale}/zayavka`,
      },
      {
        // Без него неизвестный адрес давал пустую страницу со статусом 200 — для
        // поисковика «мягкий 404», дубль пустой страницы. Здесь хотя бы noindex
        // (router/constants.ts) и дорога назад; настоящий 404 SPA не отдаст.
        path: ":pathMatch(.*)*",
        name: "not-found",
        component: () => import("@/pages/NotFoundPage.vue"),
        meta: { requiresAuth: false },
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
  applySeo(to, locale);
});

export default router;

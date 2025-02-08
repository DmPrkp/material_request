import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import { useHead } from "@vueuse/head";
import { Locale } from "@/types";
import { defaultKeys, routeMeta } from "./constants";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: `/${import.meta.env.VITE_RU_LOCALE}/main`,
  },
  {
    path: "/:locale",
    redirect: (to) => `${to.path}/main`,
    component: {
      template: "<router-view />",
    },
    children: [
      {
        path: "about",
        name: "about",
        component: () => import("@/pages/AboutPage.vue"),
      },
      {
        path: "main",
        name: "main",
        component: () => import("@/pages/MainPage.vue"),
        children: [
          {
            path: ":workType",
            name: "work-type",
            component: () => import("@/pages/SystemsPage.vue"),
            children: [
              {
                path: ":system",
                name: "system",
                component: () => import("@/pages/ComponentsPage.vue"),
                children: [
                  {
                    path: "materialList",
                    name: "material-list",
                    component: () => import("@/pages/MaterialListPage.vue"),
                    // children: [
                    //   {
                    //     path: "materialListModal",
                    //     name: "material-list-modal",
                    //   },
                    // ],
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
        children: [
          {
            path: ":zayavka",
            name: "zayavka",
            component: () => import("@/pages/ZayavkaPage.vue"),
          },
        ],
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("@/pages/SettingsPage.vue"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes,
});

router.afterEach((to) => {
  const locale =
    ((Array.isArray(to.params.locale)
      ? to.params.locale[0]
      : to.params.locale) as Locale) || "ru";

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

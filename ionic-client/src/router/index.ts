import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";

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

export default router;

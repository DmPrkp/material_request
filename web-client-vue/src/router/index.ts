import { createRouter, createWebHistory, type RouteLocationRaw, type RouteRecordRaw } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes: [
    {
      path: '/',
      redirect: `/${import.meta.env.VITE_RU_LOCALE}/calc`
    },
    {
      path: '/:locale',
      redirect: to => `${to.path}/calc`,
      component: {
        template: '<router-view />'
      },
      children: [
        {
          path: 'calc',
          name: 'calc',
          component: () => import('@/pages/CalcPage.vue')
        },
        {
          path: 'about-project',
          name: 'about-project',
          component: () => import('@/pages/AboutPage.vue')
        }
      ]
    }
  ]
});

export default router;

import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: `/${import.meta.env.VITE_RU_LOCALE}/calc`
  },
  {
    path: '/:locale',
    redirect: to => `${to.path}/main`,
    component: {
      template: '<router-view />'
    },
    children: [
      {
        path: 'main',
        name: 'main',
        component: () => import('@/pages/MainPage.vue'),
        children: [
          {
            path: ':systems',
            name: 'systems',
            component: () => import('@/pages/SystemsPage.vue'),
            children: [
              {
                path: ':components',
                name: 'components',
                component: () => import('@/pages/ComponentsPage.vue'),
              },
            ]
          },
        ]
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('@/pages/AboutPage.vue')
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/SettingsPage.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router

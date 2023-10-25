import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue'

const routes: Array<RouteRecordRaw> = [
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
        component: () => import('@/pages/HomePage.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router

import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'home', params: { locale: import.meta.env.VITE_RU_LOCALE } },
    },
    {
      // path: "/:locale(^[a-z][a-z]$)",
      path: "/:locale",
      // redirect: { name: 'home', params: { locale: import.meta.env.VITE_RU_LOCALE } },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue')
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('@/views/AboutView.vue')
        }
      ]
    }
  ]
})

export default router

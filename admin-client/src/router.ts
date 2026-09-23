import { createRouter, createWebHistory } from 'vue-router';

import { token } from './api';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./pages/LoginPage.vue') },
    { path: '/', name: 'home', component: () => import('./pages/HomePage.vue') },
    // Ключ таблицы — в адресе: ссылку можно открыть в соседней вкладке. Параметр не :key —
    // это зарезервированный атрибут Vue, пропсом он до страницы не дойдёт.
    { path: '/t/:table', name: 'table', component: () => import('./pages/TablePage.vue'), props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach((to) => {
  if (!token.value && to.name !== 'login') return { name: 'login', query: { next: to.fullPath } };
  if (token.value && to.name === 'login') return { name: 'home' };
});

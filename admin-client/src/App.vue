<template>
  <RouterView v-if="!token" />
  <div
    v-else
    class="layout"
  >
    <TableMenu class="layout__menu" />
    <main class="layout__main">
      <RouterView :key="$route.fullPath" />
    </main>
  </div>
</template>

<script setup lang="ts">
  import { watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';

  import { token } from './api';
  import TableMenu from './components/TableMenu.vue';

  const router = useRouter();
  const route = useRoute();

  // Токен сбросил ответ 401/403 посреди работы — на вход, с возвратом туда же.
  watch(token, (value) => {
    if (!value && route.name !== 'login') void router.push({ name: 'login', query: { next: route.fullPath } });
  });
</script>

<style scoped>
  .layout {
    display: flex;
    height: 100%;
  }

  .layout__menu {
    flex: 0 0 280px;
  }

  .layout__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
</style>

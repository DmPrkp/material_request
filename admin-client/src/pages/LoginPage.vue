<template>
  <div class="login">
    <form
      class="login__form"
      @submit.prevent="submit"
    >
      <h2>matli admin</h2>
      <InputText
        v-model="login"
        placeholder="Логин"
        autocomplete="username"
        autofocus
        fluid
      />
      <Password
        v-model="password"
        placeholder="Пароль"
        :feedback="false"
        toggle-mask
        input-id="password"
        :input-props="{ autocomplete: 'current-password' }"
        fluid
      />
      <Message
        v-if="error"
        severity="error"
        size="small"
      >
        {{ error }}
      </Message>
      <Button
        type="submit"
        label="Войти"
        :loading="loading"
        :disabled="!login || !password"
        fluid
      />
    </form>
  </div>
</template>

<script setup lang="ts">
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import Password from 'primevue/password';
  import { ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';

  import { api, ApiError, setToken } from '@/api';

  const route = useRoute();
  const router = useRouter();

  const login = ref('');
  const password = ref('');
  const error = ref('');
  const loading = ref(false);

  async function submit() {
    error.value = '';
    loading.value = true;
    try {
      const { accessToken } = await api.login(login.value, password.value);
      setToken(accessToken);
      const next = typeof route.query.next === 'string' ? route.query.next : '/';
      await router.replace(next);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) error.value = 'Неверный логин или пароль';
      else if (e instanceof ApiError && e.status === 403) error.value = 'Вход только для роли ADMIN';
      else error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }
</script>

<style scoped>
  .login {
    height: 100%;
    display: grid;
    place-items: center;
  }

  .login__form {
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .login__form h2 {
    margin: 0 0 8px;
  }
</style>

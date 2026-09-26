<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ title }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <AuthForm
            v-model:mode="mode"
            @success="handleSuccess"
          />
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  /**
   * Отдельный адрес входа: сюда ведут прямые ссылки и редирект гварда с ?redirect=.
   * Сама форма общая с модалкой из шапки (AuthForm) — здесь только обёртка и то,
   * куда уйти после успеха.
   */
  import { computed, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import AuthForm from "@/components/pagesParts/auth/AuthForm.vue";

  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const mode = ref<"login" | "register">("login");

  const title = computed(() =>
    mode.value === "login"
      ? t("pages.auth.title_login")
      : t("pages.auth.title_register"),
  );

  watch(
    () => route.query.mode,
    (newMode) => {
      if (newMode === "register" || newMode === "login") {
        mode.value = newMode;
      }
    },
    { immediate: true },
  );

  function handleSuccess() {
    const redirect =
      typeof route.query.redirect === "string"
        ? route.query.redirect
        : `/${route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE}/zayavka`;

    router.replace(redirect);
  }
</script>

<style scoped>
  ion-card {
    max-width: 480px;
    margin: 40px auto;
  }
</style>

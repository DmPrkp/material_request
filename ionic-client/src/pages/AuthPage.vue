<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ title }}</ion-card-title>
          <ion-card-subtitle>{{ subtitle }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-segment v-model="mode" @ionChange="handleModeChange">
            <ion-segment-button value="login">
              {{ $t("pages.auth.login") }}
            </ion-segment-button>
            <ion-segment-button value="register">
              {{ $t("pages.auth.register") }}
            </ion-segment-button>
          </ion-segment>

          <form @submit.prevent="handleSubmit">
            <ion-list>
              <ion-item>
                <ion-label position="stacked">
                  {{ $t("pages.auth.email") }}
                </ion-label>
                <ion-input
                  v-model="email"
                  autocomplete="email"
                  inputmode="email"
                  type="email"
                  required
                />
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  {{ $t("pages.auth.password") }}
                </ion-label>
                <ion-input
                  v-model="password"
                  type="password"
                  autocomplete="current-password"
                  :minlength="6"
                  required
                />
              </ion-item>

              <ion-item v-if="mode === 'register'">
                <ion-label position="stacked">
                  {{ $t("pages.auth.confirm") }}
                </ion-label>
                <ion-input
                  v-model="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  :minlength="6"
                  required
                />
              </ion-item>
            </ion-list>

            <ion-text v-if="errorMessage" color="danger">
              <p class="error-text">{{ errorMessage }}</p>
            </ion-text>

            <ion-button
              expand="block"
              type="submit"
              :disabled="isSubmitting"
            >
              <ion-spinner v-if="isSubmitting" name="dots" />
              <span v-else>
                {{ mode === "login"
                  ? $t("pages.auth.login_action")
                  : $t("pages.auth.register_action") }}
              </span>
            </ion-button>
          </form>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import {
    IonPage,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonText,
    IonButton,
    IonSpinner,
  } from "@ionic/vue";
  import { computed, ref, watch } from "vue";
  import { useAuthStore } from "@/store/auth";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";

  type AuthMode = "login" | "register";

  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const { t } = useI18n();

  const mode = ref<AuthMode>("login");
  const email = ref<string>("");
  const password = ref<string>("");
  const confirmPassword = ref<string>("");
  const isSubmitting = computed(() => authStore.status === "loading");
  const errorMessage = computed(() => authStore.error);

  const title = computed(() =>
    mode.value === "login"
      ? t("pages.auth.title_login")
      : t("pages.auth.title_register")
  );
  const subtitle = computed(() => t("pages.auth.subtitle"));

  watch(
    () => route.query.mode,
    (newMode) => {
      if (newMode === "register" || newMode === "login") {
        mode.value = newMode;
      }
    },
    { immediate: true }
  );

  function handleModeChange(event: CustomEvent) {
    const value = event.detail.value;
    if (value === "login" || value === "register") {
      mode.value = value;
    }
  }

  async function handleSubmit() {
    authStore.clearError();
    try {
      if (mode.value === "register") {
        if (password.value !== confirmPassword.value) {
          throw new Error(t("pages.auth.password_mismatch"));
        }
        await authStore.register(email.value, password.value);
      } else {
        await authStore.login(email.value, password.value);
      }

      const redirect =
        typeof route.query.redirect === "string"
          ? route.query.redirect
          : `/${route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE}/main`;

      router.replace(redirect);
      email.value = "";
      password.value = "";
      confirmPassword.value = "";
    } catch (error) {
      if (error instanceof Error) {
        authStore.error = error.message;
      }
    }
  }
</script>

<style scoped>
  ion-card {
    max-width: 480px;
    margin: 40px auto;
  }

  .error-text {
    margin: 16px 0;
  }
</style>

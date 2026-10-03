<template>
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
          {{ $t("pages.auth.username") }}
        </ion-label>
        <ion-input
          v-model="login"
          autocomplete="username"
          autocapitalize="off"
          required
        />
      </ion-item>

      <template v-if="mode === 'register'">
        <ion-item>
          <ion-label position="stacked">
            {{ $t("pages.auth.first_name") }}
          </ion-label>
          <ion-input v-model="firstName" autocomplete="given-name" required />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">
            {{ $t("pages.auth.last_name") }}
          </ion-label>
          <ion-input v-model="lastName" autocomplete="family-name" />
        </ion-item>

        <ion-item lines="none">
          <ion-label position="stacked">
            {{ $t("pages.auth.email") }}
          </ion-label>
          <ion-input
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            autocapitalize="off"
          />
        </ion-item>
        <p class="field-hint">{{ $t("pages.auth.email_hint") }}</p>
      </template>

      <ion-item>
        <ion-label position="stacked">
          {{ $t("pages.auth.password") }}
        </ion-label>
        <ion-input
          v-model="password"
          type="password"
          :autocomplete="
            mode === 'register' ? 'new-password' : 'current-password'
          "
          :minlength="mode === 'register' ? 6 : undefined"
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

    <CutCornerBtn
      expand="block"
      type="submit"
      :disabled="isSubmitting"
      fullWidth
    >
      <ion-spinner v-if="isSubmitting" name="dots" />
      <span v-else>
        {{
          mode === "login"
            ? $t("pages.auth.login_action")
            : $t("pages.auth.register_action")
        }}
      </span>
    </CutCornerBtn>

    <p v-if="mode === 'login'" class="forgot-line">
      <button type="button" class="link-btn" @click="emit('forgot')">
        {{ $t("pages.auth.forgot") }}
      </button>
    </p>
  </form>
</template>

<script setup lang="ts">
  /**
   * Вход и регистрация одной формой. Показывают её двое — страница /auth и модалка
   * из шапки, — поэтому переход после успеха не здесь, а в событии `success`:
   * странице нужен redirect, модалке — просто закрыться.
   *
   * Режим отдан наружу через v-model: заголовок («Вход»/«Регистрация») рисует тот,
   * кто форму показывает, а у страницы он ещё и приходит из query.
   */
  import { computed, ref } from "vue";
  import { useRoute } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { useAuthStore } from "@/store/auth";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";

  const mode = defineModel<"login" | "register">("mode", { default: "login" });
  // forgot наружу по той же причине, что и success: странице надо уйти на роут,
  // а модалке сперва закрыться.
  const emit = defineEmits<{ success: []; forgot: [] }>();

  const authStore = useAuthStore();
  const route = useRoute();
  const { t } = useI18n();

  /** Язык письма и локаль в ссылке: сервер своей не знает, берём из адреса. */
  const locale = computed(() =>
    String(route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE || "ru"),
  );

  const login = ref<string>("");
  const firstName = ref<string>("");
  const lastName = ref<string>("");
  const email = ref<string>("");
  const password = ref<string>("");
  const confirmPassword = ref<string>("");
  const isSubmitting = computed(() => authStore.status === "loading");
  const errorMessage = computed(() => authStore.error);

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
        await authStore.register({
          login: login.value,
          password: password.value,
          firstName: firstName.value,
          lastName: lastName.value.trim() || undefined,
          // Пустую почту не шлём вовсе: поле необязательное, а сервер строгий — пустая
          // строка не адрес и упала бы валидацией.
          email: email.value.trim() || undefined,
          locale: locale.value,
        });
      } else {
        await authStore.login(login.value, password.value);
      }

      login.value = "";
      firstName.value = "";
      lastName.value = "";
      email.value = "";
      password.value = "";
      confirmPassword.value = "";
      emit("success");
    } catch (error) {
      if (error instanceof Error) {
        authStore.error = error.message;
      }
    }
  }
</script>

<style scoped>
  .error-text {
    margin: 16px 0;
  }

  /* Прижата к полю почты и отбита снизу: посередине между полями подсказка читалась
     так, будто относится к паролю. */
  .field-hint {
    margin: 2px 16px 18px;
    font-size: 0.8rem;
    line-height: 1.35;
    color: var(--ion-color-medium);
  }

  .forgot-line {
    margin: 12px 0 0;
    text-align: center;
  }

  .link-btn {
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: var(--ion-color-primary);
    text-decoration: underline;
    cursor: pointer;
  }
</style>

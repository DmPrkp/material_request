<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("pages.settings.heading") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            :aria-label="$t('ui.buttons.close')"
            @click="emit('close')"
          >
            <ion-icon
              slot="icon-only"
              :icon="closeOutline"
            />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Компании — первыми: это работа, а внешний вид и профиль трогают редко. -->
      <SettingsCompanies v-if="authStore.isAuthenticated" />

      <ion-card>
        <ion-card-header>
          <ion-card-title>
            {{ $t("pages.settings.appearance") }}
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <LocaleSwitch />
            <ThemeSwitch />
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="authStore.isAuthenticated">
        <ion-card-header>
          <ion-card-title>
            {{ $t("pages.settings.title") }}
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h2>{{ displayIdentifier }}</h2>
                <p>
                  {{ $t("pages.settings.joined") }}:
                  {{ formattedDate(authStore.user?.createdAt) }}
                </p>
              </ion-label>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">
                {{ $t("pages.settings.email") }}
              </ion-label>
              <ion-input
                v-model="emailDraft"
                type="email"
                inputmode="email"
                autocomplete="email"
                autocapitalize="off"
              />
            </ion-item>
          </ion-list>

          <!-- Только тем, у кого почты ещё нет: остальным ниже и так написано состояние. -->
          <p
            v-if="!savedEmail"
            class="field-hint"
          >
            {{ $t("pages.auth.email_hint") }}
          </p>

          <ion-text
            v-if="savedEmail && !emailChanged"
            :color="isVerified ? 'success' : 'warning'"
          >
            <p class="email-status">
              {{
                isVerified
                  ? $t("pages.settings.email_verified")
                  : $t("pages.settings.email_unverified")
              }}
            </p>
          </ion-text>

          <ion-text
            v-if="emailMessage"
            color="medium"
          >
            <p class="email-status">{{ emailMessage }}</p>
          </ion-text>

          <ion-text
            v-if="emailError"
            color="danger"
          >
            <p class="email-status">{{ emailError }}</p>
          </ion-text>

          <CutCornerBtn
            v-if="emailChanged"
            class="email_btn"
            :disabled="emailBusy"
            @click="saveEmail"
          >
            {{ $t("pages.settings.email_save") }}
          </CutCornerBtn>

          <CutCornerBtn
            v-else-if="savedEmail && !isVerified"
            class="email_btn"
            :disabled="emailBusy"
            @click="resendVerification"
          >
            {{ $t("pages.settings.email_resend") }}
          </CutCornerBtn>
          <CutCornerBtn
            class="logout_btn"
            @click="handleLogout"
          >
            {{ $t("pages.settings.logout") }}
          </CutCornerBtn>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-modal>
</template>

<script lang="ts" setup>
  /**
   * Настройки — модалка, а не страница: своего адреса у них нет, открываются
   * поверх текущего экрана и не ломают навигацию «назад». Смена языка внутри
   * меняет URL под модалкой — App.vue при этом не пересоздаётся, и модалка
   * остаётся открытой уже на новом языке.
   */
  import {
    IonButtons,
    IonHeader,
    IonIcon,
    IonModal,
    IonToolbar,
  } from "@ionic/vue";
  import { closeOutline } from "ionicons/icons";
  import { computed, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import LocaleSwitch from "@/components/logicalSwitchers/LocaleSwitch.vue";
  import ThemeSwitch from "@/components/logicalSwitchers/ThemeSwitch.vue";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import SettingsCompanies from "@/components/nav/SettingsCompanies.vue";
  import { useAuthStore } from "@/store/auth";

  defineProps<{ isOpen: boolean }>();
  const emit = defineEmits<{ close: [] }>();

  const authStore = useAuthStore();
  const router = useRouter();
  const route = useRoute();
  const { t } = useI18n();

  const displayIdentifier = computed(
    () => authStore.user?.username ?? authStore.user?.email ?? "—",
  );

  /**
   * Почта здесь — единственный способ добавить её тем, кто регистрировался до того, как
   * поле появилось в форме. Пока адрес не подтверждён, восстановление пароля им не работает,
   * поэтому состояние показываем прямо тут, а не прячем.
   */
  const emailDraft = ref<string>(authStore.user?.email ?? "");
  const emailBusy = ref<boolean>(false);
  const emailMessage = ref<string>("");
  const emailError = ref<string>("");

  const savedEmail = computed(() => authStore.user?.email ?? "");
  const isVerified = computed(() => Boolean(authStore.user?.emailVerifiedAt));
  const emailChanged = computed(
    () => emailDraft.value.trim().toLowerCase() !== savedEmail.value.toLowerCase(),
  );

  // Профиль подтягивается асинхронно и может приехать уже после открытия модалки.
  watch(
    () => authStore.user?.email,
    (email) => {
      emailDraft.value = email ?? "";
    },
  );

  async function saveEmail() {
    emailBusy.value = true;
    emailMessage.value = "";
    emailError.value = "";
    try {
      // Пустое поле — убрать адрес совсем, а не сохранить пустую строку.
      await authStore.updateEmail(
        emailDraft.value.trim().toLowerCase() || null,
        currentLocale(),
      );
      if (savedEmail.value) emailMessage.value = t("pages.settings.email_sent");
    } catch {
      emailError.value = t("pages.settings.email_error");
    } finally {
      emailBusy.value = false;
    }
  }

  async function resendVerification() {
    emailBusy.value = true;
    emailMessage.value = "";
    emailError.value = "";
    try {
      await authStore.requestEmailVerification(currentLocale());
      emailMessage.value = t("pages.settings.email_sent");
    } catch {
      emailError.value = t("pages.settings.email_error");
    } finally {
      emailBusy.value = false;
    }
  }

  function currentLocale() {
    return typeof route.params.locale === "string"
      ? route.params.locale
      : import.meta.env.VITE_DEFAULT_LOCALE;
  }

  function formattedDate(date?: string) {
    if (!date) return "—";
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }
    return parsedDate.toLocaleString(currentLocale());
  }

  function handleLogout() {
    authStore.logout();
    // Сначала закрываем модалку, иначе она осталась бы висеть поверх входа.
    emit("close");
    router.replace({ name: "auth", params: { locale: currentLocale() } });
  }
</script>

<style scoped>
  .field-hint {
    margin: 4px 16px 0;
    font-size: 0.8rem;
    color: var(--ion-color-medium);
  }

  .email-status {
    margin: 8px 16px 0;
    font-size: 0.85rem;
  }

  .email_btn {
    margin-top: 12px;
  }

  .logout_btn {
    margin-top: 12px;
  }
</style>

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
          </ion-list>
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
  import { computed } from "vue";
  import { useRoute, useRouter } from "vue-router";
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

  const displayIdentifier = computed(
    () => authStore.user?.username ?? authStore.user?.email ?? "—",
  );

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
  .logout_btn {
    margin-top: 12px;
  }
</style>

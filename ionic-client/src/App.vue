<template>
  <ion-app>
    <ion-header
      :translucent="true"
      color="medium"
    >
      <ion-toolbar>
        <router-link :to="getLocalizedRoute('main')">
          <ion-title
            class="main_title"
            style="
              /* font-style: italic; */
              /* font-weight: 100; */
              font-size: 1.5em;
            "
          >
            {{ "zayávka" }}
          </ion-title>
        </router-link>

        <ion-buttons slot="end">
          <!--
            text="": без него в режиме ios (iPhone, Safari) Ionic подписывает стрелку
            своим английским «Back». aria-label по той же причине свой — у Ionic «back».
          -->
          <ion-back-button
            v-if="route.matched.length > 2"
            default-href=""
            text=""
            :aria-label="$t('ui.buttons.back')"
            @click="router.back"
          />
          <AuthAvatar @click="openAccount" />
          <ion-button
            class="settings_trigger"
            fill="clear"
            shape="round"
            :aria-label="$t('pages.settings.open')"
            :title="$t('pages.settings.open')"
            @click="settingsOpen = true"
          >
            <ion-icon
              slot="icon-only"
              :icon="settingsSharp"
            />
          </ion-button>
        </ion-buttons>
        <ion-progress-bar
          v-if="preloaderStatus"
          type="indeterminate"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content class="main_content">
      <router-view></router-view>
    </ion-content>
    <FooterBar />
    <!-- Модалки в корне, а не рядом с аватаром: стили шапки не влияют на оверлей. -->
    <SettingsModal
      :is-open="settingsOpen"
      @close="settingsOpen = false"
    />
    <AuthModal
      :is-open="authOpen"
      @close="authOpen = false"
    />
  </ion-app>
</template>

<script setup lang="ts">
  import { onMounted, type ComputedRef, computed, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import {
    IonApp,
    IonHeader,
    IonToolbar,
    IonProgressBar,
    IonButtons,
    IonBackButton,
    IonIcon,
  } from "@ionic/vue";
  import { settingsSharp } from "ionicons/icons";
  import FooterBar from "@/components/nav/FooterBar.vue";
  import AuthAvatar from "@/components/nav/AuthAvatar.vue";
  import AuthModal from "@/components/nav/AuthModal.vue";
  import SettingsModal from "@/components/nav/SettingsModal.vue";
  import injectI18nToRoute from "@/mixins/injectI18nToRoute";
  import { useAuthStore } from "./store/auth";
  import { usePreloader } from "./store/preloader";

  const preloader = usePreloader();
  const authStore = useAuthStore();

  /** Настройки и вход — не роуты, а модалки поверх текущего экрана. */
  const settingsOpen = ref(false);
  const authOpen = ref(false);

  /**
   * Аватар ведёт туда, где по состоянию есть смысл: гостя зовём войти, вошедшему
   * показываем профиль — он в настройках, рядом с выходом.
   */
  function openAccount() {
    if (authStore.isAuthenticated) {
      settingsOpen.value = true;
      return;
    }
    authOpen.value = true;
  }

  const preloaderStatus: ComputedRef<boolean> = computed(() => preloader.state);

  const route = useRoute();
  const router = useRouter();
  const locale = route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE;

  onMounted(() => {
    const base = route.params.locale || locale;
    const fullPath = `/${base}/ru`;
    if (fullPath) return fullPath;
    return base;
  });

  const getLocalizedRoute = (routeName: string) => {
    const route = useRoute();
    const routeLocale =
      typeof route.params.locale === "string" ? route.params.locale : null;
    const locale = routeLocale || import.meta.env.VITE_DEFAULT_LOCALE;
    return injectI18nToRoute(routeName, locale, route);
  };
</script>

<style>
  @import "@/assets/css";
  @import "@/assets/css/main.css";

  .main_title {
    /* color: var(--main-red); */
    font-weight: 1000;
  }

  .main_content {
    max-width: 1000px;
    display: flex;
    align-self: center;
  }
</style>

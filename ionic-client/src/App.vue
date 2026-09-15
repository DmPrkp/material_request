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
            {{ "zaiávka" }}
          </ion-title>
        </router-link>

        <ion-buttons slot="end">
          <ion-back-button
            v-if="route.matched.length > 2"
            default-href=""
            @click="router.back"
          />
          <ion-button
            v-if="!authStore.isAuthenticated"
            class="auth_warning"
            fill="clear"
            shape="round"
            color="warning"
            :aria-label="$t('pages.auth.not_authorized')"
            :title="$t('pages.auth.not_authorized')"
            @click="goToAuth"
          >
            <ion-icon
              slot="icon-only"
              :icon="alertCircle"
            />
          </ion-button>
          <SettingsAvatar @click="settingsOpen = true" />
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
    <!-- Модалка в корне, а не рядом с аватаром: стили шапки не влияют на оверлей. -->
    <SettingsModal
      :is-open="settingsOpen"
      @close="settingsOpen = false"
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
  import { alertCircle } from "ionicons/icons";
  import FooterBar from "@/components/nav/FooterBar.vue";
  import SettingsAvatar from "@/components/nav/SettingsAvatar.vue";
  import SettingsModal from "@/components/nav/SettingsModal.vue";
  import injectI18nToRoute from "@/mixins/injectI18nToRoute";
  import { useAuthStore } from "./store/auth";
  import { usePreloader } from "./store/preloader";

  const preloader = usePreloader();
  const authStore = useAuthStore();

  /** Восклицательный знак у аватара ведёт на вход и сам исчезает после него. */
  function goToAuth() {
    if (route.name === "auth") return;
    router.push({
      name: "auth",
      params: { locale: route.params.locale || locale },
      query: { redirect: route.fullPath },
    });
  }

  /** Настройки — не роут, а модалка поверх любого экрана. */
  const settingsOpen = ref(false);

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

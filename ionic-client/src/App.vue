<template>
  <ion-app>
    <ion-header :translucent="true">
      <ion-toolbar>
        <router-link :to="getLocalizedRoute('main')">
          <ion-title
            color="primary"
            class="main_title"
          >
            zayávka.xyz
          </ion-title>
        </router-link>

        <ion-buttons slot="end">
          <ThemeSwitch />
          <ion-back-button
            v-if="route.matched.length > 2"
            default-href=""
            @click="router.back"
          />
        </ion-buttons>
        <ion-progress-bar
          v-if="preloaderStatus"
          type="indeterminate"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <router-view></router-view>
    </ion-content>
    <FooterBar />
  </ion-app>
</template>

<script setup lang="ts">
  import { onMounted, type ComputedRef, computed } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import {
    IonApp,
    IonHeader,
    IonToolbar,
    IonProgressBar,
    IonButtons,
    IonBackButton,
  } from "@ionic/vue";
  import ThemeSwitch from "@/components/logicalSwitchers/ThemeSwitch.vue";
  import FooterBar from "@/components/nav/FooterBar.vue";
  import injectI18nToRoute from "@/mixins/injectI18nToRoute";
  import { usePreloader } from "./store/preloader";

  const preloader = usePreloader();

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
</style>

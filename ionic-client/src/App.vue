<template>
  <ion-app>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons v-if="route.matched.length > 2" slot="start">
          <ion-back-button default-href="" @click="router.back" />
        </ion-buttons>
        <ion-title>{{ $t("title") }}</ion-title>
        <ion-progress-bar v-if="mainMenuStatus === 'none'" type="indeterminate" />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-router-outlet />
    </ion-content>
    <FooterBar />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, type ComputedRef, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonApp, IonHeader, IonToolbar, IonProgressBar, IonButtons, IonBackButton,
} from '@ionic/vue';
import FooterBar from './components/nav/FooterBar.vue';
import { useMainMenuStore } from '@/store/MainMenuStore';

const mainMenuStore = useMainMenuStore();

const mainMenuStatus : ComputedRef<string> = computed(() => mainMenuStore.status);

const route = useRoute();
const router = useRouter();
const locale = route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE;

onMounted(() => {
  const base = route.params.locale || locale;
  const fullPath = `/${base}/ru`;
  if (fullPath) return fullPath;
  return base;
});
</script>

<style>
@import "@/assets/css";
@import "@/assets/css/main.css";

ion-toolbar {
    --background: var(--header-bar-color);
    /* --color: white;

    --border-color: #f24aec;
    --border-width: 4px 0;
    --border-style: double;

    --min-height: 80px;
    --padding-top: 20px;
    --padding-bottom: 20px; */
  }

</style>

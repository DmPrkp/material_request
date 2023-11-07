<template>
  <ion-app>
    <ion-header>
      <ion-toolbar>
        <ion-buttons v-if="route.matched.length > 2" slot="start">
          <ion-back-button default-href="" @click="router.back"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t("title") }}</ion-title>
        <ion-progress-bar v-if="mainMenuStatus === 'none'" type="indeterminate"></ion-progress-bar>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-router-outlet></ion-router-outlet>
    </ion-content>

    <FooterBar></FooterBar>
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, type ComputedRef, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonApp, IonHeader, IonToolbar, IonProgressBar, IonButtons, IonBackButton} from '@ionic/vue';
import FooterBar from './components/nav/FooterBar.vue';
import { mainMenuStore } from '@/store/MainMenuStore'
const store = mainMenuStore()

const mainMenuStatus : ComputedRef<string> = computed(() => store.status)

const route = useRoute();
const router = useRouter()
const locale = route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE;

const handleRefresh = (event: CustomEvent) => {
        setTimeout(() => {
          event.target.complete();
        }, 2000);
      };

onMounted(() => {
  const base = route.params.locale || locale;
  const fullPath = `/${base}/ru`;
})
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

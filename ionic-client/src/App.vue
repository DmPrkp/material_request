<template>
  <ion-app>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("title") }}</ion-title>
        <ion-progress-bar type="indeterminate"></ion-progress-bar>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <ion-router-outlet />
    </ion-content>
    <ion-footer>
      <ion-fab slot="fixed" vertical="bottom" horizontal="center">
        <ion-fab-button>
          <ion-icon :icon="calculatorOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-footer>
    
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { IonApp, IonRouterOutlet, IonContent, IonHeader, IonTitle, IonToolbar, IonProgressBar, IonRefresher, IonRefresherContent, IonFooter, IonFab, IonFabButton, IonIcon } from '@ionic/vue';
import { calculatorOutline } from 'ionicons/icons';

const route = useRoute();
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

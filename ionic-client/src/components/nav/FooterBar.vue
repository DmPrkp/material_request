<template>
  <ion-footer>
    <ion-grid>
      <ion-row>
        <ion-col
          v-for="item in menuItems"
          :key="item.name"
          no-padding
          class="ion-align-self-end"
        >
          <router-link :to="getLocalizedRoute(item.link)">
            <ion-icon
              color="dark"
              :icon="item.icon"
              size="large"
            />
          </router-link>
          <ion-text style="font-size: small">
            {{ $t(`footer.${item.name}`) }}
          </ion-text>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-footer>
</template>

<script setup lang="ts">
  import {
    IonIcon,
    IonFooter,
    IonGrid,
    IonCol,
    IonText,
    IonRow,
  } from "@ionic/vue";
  import {
    calculatorOutline,
    settingsOutline,
    informationCircleOutline,
    documentsOutline,
    logInOutline,
  } from "ionicons/icons";
  import { computed } from "vue";
  import { useRoute } from "vue-router";
  import injectI18nToRoute from "@/mixins/injectI18nToRoute";
  import { useAuthStore } from "@/store/auth";

  const authStore = useAuthStore();

  const menuItems = computed(() => {
    if (authStore.isAuthenticated) {
      return [
        {
          link: "about",
          name: "about",
          icon: informationCircleOutline,
        },
        {
          link: "main",
          name: "main",
          icon: calculatorOutline,
        },
        {
          link: "zayavka",
          name: "zayavka",
          icon: documentsOutline,
        },
        {
          link: "settings",
          name: "settings",
          icon: settingsOutline,
        },
      ];
    }

    return [
      {
        link: "about",
        name: "about",
        icon: informationCircleOutline,
      },
      {
        link: "auth",
        name: "auth",
        icon: logInOutline,
      },
      {
        link: "main",
        name: "main",
        icon: calculatorOutline,
      },
      {
        link: "settings",
        name: "settings",
        icon: settingsOutline,
      },
    ];
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
  ion-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
</style>

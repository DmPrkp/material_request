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
    libraryOutline,
    documentsOutline,
    archiveOutline,
    logInOutline,
  } from "ionicons/icons";
  import { computed } from "vue";
  import { useRoute } from "vue-router";
  import injectI18nToRoute from "@/mixins/injectI18nToRoute";
  import { useAuthStore } from "@/store/auth";
  import { AUTH_ENABLED } from "@/constants/auth";

  const authStore = useAuthStore();

  const CATALOG = {
    link: "catalog",
    name: "catalog",
    icon: libraryOutline,
  };
  const ZAYAVKA = {
    link: "zayavka",
    name: "zayavka",
    icon: documentsOutline,
  };
  const WAREHOUSES = {
    link: "warehouses",
    name: "warehouses",
    icon: archiveOutline,
  };
  const AUTH = {
    link: "auth",
    name: "auth",
    icon: logInOutline,
  };

  // Настроек здесь нет: они открываются аватаром справа в шапке. Калькулятора тоже:
  // он внутри «Заявок» (кнопка «Новая заявка»), а /main — пустой, по логотипу.
  const menuItems = computed(() => {
    // Пока авторизация выключена флагом, вкладку входа не показываем
    // и работаем так, будто пользователь уже вошёл.
    if (!AUTH_ENABLED || authStore.isAuthenticated) {
      return [CATALOG, ZAYAVKA, WAREHOUSES];
    }

    return [CATALOG, AUTH, ZAYAVKA];
  });

  const getLocalizedRoute = (routeName: string) => {
    const route = useRoute();
    const routeLocale =
      typeof route.params.locale === "string" ? route.params.locale : null;
    const locale = routeLocale || import.meta.env.VITE_DEFAULT_LOCALE;
    return injectI18nToRoute(routeName, locale, route);
  };
</script>

<!--
  scoped обязательно: без него правило уходило на все ion-col приложения, и таблицы
  молча жили центрированными — двухстрочные названия вставали по центру.
-->
<style scoped>
  ion-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
</style>

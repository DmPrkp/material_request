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
            <ion-icon color="dark" :icon="item.icon" />
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
  import { computed } from "vue";
  import { useRoute } from "vue-router";
  import injectI18nToRoute from "@/mixins/injectI18nToRoute";
  import { useAuthStore } from "@/store/auth";
  import { AUTH_ENABLED } from "@/constants/auth";
  import {
    AUTH,
    CALCULATOR,
    CATALOG,
    WAREHOUSES,
    ZAYAVKA,
  } from "@/constants/nav";

  const authStore = useAuthStore();

  // Настроек здесь нет: они в боковом меню справа в шапке, профиль — по аватару.
  // На /main тоже не ведём — туда по логотипу. Расчёт идёт перед «Заявками»:
  // сначала считают, потом сохраняют заявкой.
  const menuItems = computed(() => {
    // Пока авторизация выключена флагом, вкладку входа не показываем
    // и работаем так, будто пользователь уже вошёл.
    if (!AUTH_ENABLED || authStore.isAuthenticated) {
      return [CATALOG, CALCULATOR, ZAYAVKA, WAREHOUSES];
    }

    return [CATALOG, CALCULATOR, AUTH, ZAYAVKA];
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
  /*
   * 24px вместо ionic-ного size="large" (32px): нижняя полоса должна читаться,
   * а не перетягивать на себя экран — на телефоне она всегда перед глазами.
   */
  ion-icon {
    font-size: 24px;
  }

  ion-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
</style>

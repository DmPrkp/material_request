<template>
  <ion-menu :menu-id="MAIN_MENU_ID" content-id="main-content" side="end">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("pages.settings.menu") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :aria-label="$t('ui.buttons.close')" @click="closeMenu">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Строки: иконка слева, подпись справа — как пункты обычного списка. -->
      <ion-list>
        <ion-item
          v-for="item in menuItems"
          :key="item.name"
          button
          :detail="false"
          @click="go(item.link)"
        >
          <ion-icon slot="start" color="dark" :icon="item.icon" />
          <ion-label>{{ $t(`footer.${item.name}`) }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts" setup>
  /**
   * Боковое меню из шапки, справа: компании и настройки отдельными разделами,
   * ниже — дубль нижней полосы. Открывает App.vue через menuController по MAIN_MENU_ID.
   */
  import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonTitle,
    IonToolbar,
    menuController,
  } from "@ionic/vue";
  import { closeOutline } from "ionicons/icons";
  import { computed } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import injectI18nToRoute from "@/mixins/injectI18nToRoute";
  import { AUTH_ENABLED } from "@/constants/auth";
  import {
    CALCULATOR,
    CATALOG,
    COMPANIES,
    MAIN_MENU_ID,
    SETTINGS,
    WAREHOUSES,
    ZAYAVKA,
  } from "@/constants/nav";
  import { useAuthStore } from "@/store/auth";

  const authStore = useAuthStore();
  const route = useRoute();
  const router = useRouter();

  // Компании и склады — только вошедшим: без входа им отвечать нечем. Гостю
  // «Настройки» остаются, как и в футере.
  const menuItems = computed(() => {
    const signedIn = !AUTH_ENABLED || authStore.isAuthenticated;
    return [
      ...(signedIn ? [COMPANIES] : []),
      SETTINGS,
      ...(signedIn ? [WAREHOUSES] : []),
      CALCULATOR,
      ZAYAVKA,
      CATALOG,
    ];
  });

  function closeMenu() {
    void menuController.close(MAIN_MENU_ID);
  }

  // Локаль берём из текущего адреса, как футер; route живёт в setup, не в клике.
  function go(link: string) {
    closeMenu();
    const locale =
      typeof route.params.locale === "string"
        ? route.params.locale
        : import.meta.env.VITE_DEFAULT_LOCALE;
    void router.push(injectI18nToRoute(link, locale, route));
  }
</script>

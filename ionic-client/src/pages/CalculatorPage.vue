<template>
  <ion-page v-if="isCalculatorPage">
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title v-if="mainMenu.length">
          {{ $t(`pages.main.title`) }}
        </ion-title>
      </ion-item-divider>
      <MainMenuItems
        :items="mainMenu"
        @item="chooseItem"
      />
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import MainMenuItems from "@/components/pagesParts/MainMenuItems.vue";
  import type { MainMenuItem } from "../types/controller/main-menu";
  import { useMainMenuStore, usePreloader } from "@/store";

  const mainMenuStore = useMainMenuStore();
  const preloader = usePreloader();
  const router = useRouter();
  const route = useRoute();

  // Калькулятор вложен в «Заявки»: отсюда начинается новая заявка.
  const isCalculatorPage = ref(route.name === "calculator");
  preloader.setPreloader(true);

  watch(
    () => route.name,
    () => (isCalculatorPage.value = route.name === "calculator")
  );

  watch(
    () => mainMenuStore.$state.length,
    (newLength) => {
      if (newLength > 0) {
        preloader.setPreloader(false);
      }
    },
    { immediate: true }
  );

  const mainMenu = computed(() => mainMenuStore.$state);

  const chooseItem = (item: MainMenuItem) => {
    router.push({ name: "work-type", params: { workType: item.title } });
  };
</script>

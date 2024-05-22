<template>
  <router-view v-if="route.name !== 'work-type'" />
  <ion-page v-else>
    <ion-content class="ion-padding">
      <ion-title> Выберите технологию </ion-title>
      <main-menu-items
        v-if="currentItems[0]"
        :items="currentItems[0].items"
        @item="chooseItem"
      />
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  import { computed, ComputedRef } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import MainMenuItems from "@/components/ui/MainMenuItems.vue";
  import { type MainMenuItem } from "../../types/controller/main-menu";
  import { useMainMenuStore } from "@/store/MainMenuStore";

  const mainMenuStore = useMainMenuStore();

  const route = useRoute();
  const router = useRouter();
  const currentItems: ComputedRef<Array<MainMenuItem>> = computed(() =>
    mainMenuStore.mainMenu.filter(
      (item) => item.title === route.params.workType
    )
  );

  function chooseItem(item: MainMenuItem) {
    router.push({
      name: "system",
      params: { system: item.title },
    });
  }
</script>

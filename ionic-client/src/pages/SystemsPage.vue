<template>
  <ion-page v-if="route.name === 'work-type'">
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title> {{ $t(`pages.system.title`) }} </ion-title>
      </ion-item-divider>
      <main-menu-items
        v-if="currentItems[0]"
        :items="currentItems[0].items"
        @item="chooseItem"
      />
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script lang="ts" setup>
  import { computed, ComputedRef } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import MainMenuItems from "@/components/ui/MainMenuItems.vue";
  import { type MainMenuItem } from "../types/controller/main-menu";
  import { useMainMenuStore } from "@/store/MainMenuStore";

  const mainMenuStore = useMainMenuStore();

  const route = useRoute();
  const router = useRouter();
  const currentItems: ComputedRef<MainMenuItem[]> = computed(() =>
    mainMenuStore.mainMenu.filter(
      (item: MainMenuItem) => item.title === route.params.workType
    )
  );

  function chooseItem(item: MainMenuItem) {
    router.push({
      name: "system",
      params: { system: item.title },
    });
  }
</script>

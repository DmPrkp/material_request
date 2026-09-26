<template>
  <ion-page v-if="route.name === 'catalog'">
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>
          <h1>{{ $t("pages.catalog.title") }}</h1>
        </ion-title>
      </ion-item-divider>
      <MainMenuItems
        :items="CATALOG_MENU"
        i18n-prefix="pages.catalog.tabs"
        @item="chooseSection"
      />
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script lang="ts" setup>
  import { useRoute, useRouter } from "vue-router";
  import MainMenuItems from "@/components/pagesParts/MainMenuItems.vue";
  import type { MainMenuItem } from "@/types/controller/main-menu";
  import { CATALOG_MENU } from "@/constants";

  const route = useRoute();
  const router = useRouter();

  function chooseSection(item: MainMenuItem) {
    // По имени, а не по пути: путь /catalog/systems и так разобрался бы в свой роут,
    // но переход по имени catalog-section увёл бы его в гвард вкладок и обратно в меню.
    if (item.title === "systems") {
      router.push({ name: "catalog-systems" });
      return;
    }
    router.push({ name: "catalog-section", params: { tab: item.title } });
  }
</script>

<template>
  <!--
    Табы — адрес, а не состояние страницы (как питание у электроинструмента в каталоге):
    перезагрузка и «назад» возвращают тот же таб, а не первый.
  -->
  <ion-segment
    :value="route.name === 'warehouses' ? 'warehouses' : 'holdings'"
    @ionChange="go($event)"
  >
    <ion-segment-button value="warehouses">
      <ion-label>{{ $t("pages.warehouses.tabs.warehouses") }}</ion-label>
    </ion-segment-button>
    <ion-segment-button value="holdings">
      <ion-label>{{ $t("pages.warehouses.tabs.holdings") }}</ion-label>
    </ion-segment-button>
  </ion-segment>
</template>

<script lang="ts" setup>
  import type { SegmentCustomEvent } from "@ionic/vue";
  import { useRoute, useRouter } from "vue-router";

  const route = useRoute();
  const router = useRouter();

  function go(event: SegmentCustomEvent) {
    const name = event.detail.value === "warehouses" ? "warehouses" : "holdings";
    if (route.name === name) return;
    // replace, а не push: таб — не шаг вглубь, «назад» должен уводить со складов.
    router.replace({ name, params: { locale: route.params.locale } });
  }
</script>

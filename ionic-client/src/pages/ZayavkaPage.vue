<template>
  <ion-page v-if="route.name === 'zayavka'">
    <ion-content>
      <ion-refresher
        slot="fixed"
        @ionRefresh="handleRefresh($event)"
      >
        <ion-refresher-content />
      </ion-refresher>
      <div class="ion-padding">
        <ion-item-divider>
          <ion-title>
            {{ $t("pages.materials.title") }}
          </ion-title>
        </ion-item-divider>
      </div>
      div
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>
<script setup lang="ts">
  import { useZayavkaStore } from "@/store/zayavka";
  import { RefresherCustomEvent } from "@ionic/vue";
  import { onMounted } from "vue";
  import { useRoute } from "vue-router";
  const store = useZayavkaStore();

  const route = useRoute();

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    event.target.complete();
  }

  onMounted(() => {
    console.log(store.$state);
    console.log(store.getMaterialRequest(Number(route.params.zayavka)));
  });
</script>

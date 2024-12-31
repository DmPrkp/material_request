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
      <MaterialList :components="materials"></MaterialList>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>
<script setup lang="ts">
  import { useZayavkaStore } from "@/store/zayavka";
  import { RefresherCustomEvent } from "@ionic/vue";
  import { onMounted, ref } from "vue";
  import { useRoute } from "vue-router";
  import MaterialList from "@/components/pagesParts/materials/MaterialList.vue";
  import { StoredMaterialRequestDTO } from "@/types/dto";
  import Zayavka from "@/models/zayavka";
  const store = useZayavkaStore();

  const route = useRoute();
  const materials = ref<StoredMaterialRequestDTO["data"]["materials"]>([]);

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    event.target.complete();
  }

  onMounted(async () => {
    let mr = store.getMaterialRequest(Number(route.params.zayavka));

    if (mr) {
      materials.value = mr.data.materials;
      return;
    }

    const materialRequestsDTO = await Zayavka.find(
      Number(route.params.zayavka)
    );

    if (!materialRequestsDTO) {
      return;
    }

    store.setMaterialRequest(materialRequestsDTO);

    mr = store.getMaterialRequest(Number(route.params.zayavka));

    if (!mr) {
      return;
    }

    materials.value = mr.data.materials;
  });
</script>

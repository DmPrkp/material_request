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
      <MaterialList
        :status="MATERIAL_LIST_STATUS.DISABLED"
        :components="materials"
      ></MaterialList>
      <HandToolListHeader />
      <HandToolListItems
        :status="MATERIAL_LIST_STATUS.DISABLED"
        v-model="handTools"
      />
      <PowerToolListHeader />
      <PowerToolListItems
        :status="MATERIAL_LIST_STATUS.DISABLED"
        v-model="powerTools"
      />
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>
<script setup lang="ts">
  import { useZayavkaStore } from "@/store/zayavka";
  import { RefresherCustomEvent } from "@ionic/vue";
  import { onMounted, ref } from "vue";
  import { useRoute } from "vue-router";
  import { StoredMaterialRequestDTO } from "@/types/dto";
  import Zayavka from "@/models/zayavka";
  import { MATERIAL_LIST_STATUS } from "@/constants";
  import HandToolListItems from "@/components/pagesParts/handTools/HandToolListItems.vue";
  import HandToolListHeader from "@/components/pagesParts/handTools/HandToolListHeader.vue";
  import PowerToolListHeader from "@/components/pagesParts/powerTools/PowerToolListHeader.vue";
  import PowerToolListItems from "@/components/pagesParts/powerTools/PowerToolListItems.vue";

  const store = useZayavkaStore();
  const route = useRoute();
  const materials = ref<StoredMaterialRequestDTO["data"]["materials"]>([]);
  const handTools = ref<StoredMaterialRequestDTO["data"]["hand_tools"]>([]);
  const powerTools = ref<StoredMaterialRequestDTO["data"]["power_tools"]>([]);

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

    console.log(mr);

    materials.value = mr.data.materials;
    handTools.value = mr.data.hand_tools;
    powerTools.value = mr.data.power_tools;
  });
</script>

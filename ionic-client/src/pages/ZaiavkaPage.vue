<template>
  <ion-page v-if="route.name === 'zaiavka'">
    <ion-content :class="{ 'with-bulk-bar': loaded && authStore.isAuthenticated }">
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
      <HandToolListHeader readonly />
      <HandToolListItems
        :status="MATERIAL_LIST_STATUS.DISABLED"
        v-model="handTools"
      />
      <PowerToolListHeader readonly />
      <PowerToolListItems
        :status="MATERIAL_LIST_STATUS.DISABLED"
        v-model="powerTools"
      />
      <MaterialActionPanel
        :id="Number(route.params.zaiavka)"
        :system="system"
        :materials="resultMatList"
      />
      <!-- Пока заявка не пришла, класть на склад нечего — полосы нет. -->
      <AddToWarehouseButton
        v-if="loaded"
        slot="fixed"
        :zaiavka="resultMatList"
      />
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>
<script setup lang="ts">
  import { useZaiavkaStore } from "@/store/zaiavka";
  import { RefresherCustomEvent } from "@ionic/vue";
  import { onMounted, ref } from "vue";
  import { useRoute } from "vue-router";
  import { ResultMaterialsDTO, StoredMaterialRequestDTO } from "@/types/dto";
  import { ZaiavkaType } from "@/types/entity/zaiavka";
  import Zaiavka from "@/models/zaiavka";
  import { MATERIAL_LIST_STATUS } from "@/constants";
  import HandToolListItems from "@/components/pagesParts/handTools/HandToolListItems.vue";
  import HandToolListHeader from "@/components/pagesParts/handTools/HandToolListHeader.vue";
  import PowerToolListHeader from "@/components/pagesParts/powerTools/PowerToolListHeader.vue";
  import PowerToolListItems from "@/components/pagesParts/powerTools/PowerToolListItems.vue";
  import MaterialActionPanel from "@/components/pagesParts/MaterialActionPanel.vue";
  import AddToWarehouseButton from "@/components/pagesParts/warehouses/AddToWarehouseButton.vue";
  import { useAuthStore } from "@/store/auth";

  const store = useZaiavkaStore();
  const authStore = useAuthStore();
  const route = useRoute();
  const materials = ref<StoredMaterialRequestDTO["data"]["materials"]>([]);
  const handTools = ref<StoredMaterialRequestDTO["data"]["hand_tools"]>([]);
  const powerTools = ref<StoredMaterialRequestDTO["data"]["power_tools"]>([]);
  const system = ref<string>();
  /** Пока заявка не пришла, класть на склад нечего — полосы нет. */
  const loaded = ref(false);
  const resultMatList = ref<ResultMaterialsDTO>({
    hand_tools: [],
    materials: [],
    power_tools: [],
  });

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    event.target.complete();
  }

  onMounted(async () => {
    const id = Number(route.params.zaiavka);

    let mr = store.getMaterialRequest(id);

    if (mr) {
      setMaterials(mr.data);
      return;
    }

    const materialRequestsDTO = await Zaiavka.find(
      Number(route.params.zaiavka),
    );

    if (!materialRequestsDTO) {
      return;
    }

    store.setMaterialRequest(materialRequestsDTO);
    mr = store.getMaterialRequest(Number(route.params.zaiavka));

    if (!mr) {
      return;
    }

    setMaterials(mr.data);
  });

  function setMaterials(zaiavka: ZaiavkaType) {
    resultMatList.value = zaiavka;
    loaded.value = true;
    materials.value = zaiavka.materials;
    handTools.value = zaiavka.hand_tools;
    powerTools.value = zaiavka.power_tools;
    system.value = zaiavka.system;
  }
</script>


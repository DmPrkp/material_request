<template>
  <ion-page v-if="route.name === 'material-list'">
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
      <MaterialComponent
        :components="components"
        @update="(event) => mergeMaterials(MATERIALS_KEYS.MATERIALS, event)"
      />
      <HandToolComponent
        :components="components"
        @update="(event) => mergeMaterials(MATERIALS_KEYS.HAND_TOOLS, event)"
      />
      <PowerToolComponent
        :components="components"
        @update="(event) => mergeMaterials(MATERIALS_KEYS.POWER_TOOLS, event)"
      />
      <MaterialActionPanel :materials="resultMatList" />
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import { onMounted, ref } from "vue";
  import { LocationQuery, useRoute } from "vue-router";
  import type { CalcResponseDTO, ResultMaterialsDTO } from "@/types/dto/index";
  import { RefresherCustomEvent } from "@ionic/vue";
  import BaseModel from "@/models/calc/BaseCalcModel";
  import MaterialComponent from "@/components/pagesParts/materials/MaterialComponent.vue";
  import HandToolComponent from "@/components/pagesParts/handTools/HandToolComponent.vue";
  import PowerToolComponent from "@/components/pagesParts/powerTools/PowerToolComponent.vue";
  import MaterialActionPanel from "@/components/pagesParts/MaterialActionPanel.vue";

  const MATERIALS_KEYS = {
    MATERIALS: "materials",
    HAND_TOOLS: "hand_tools",
    POWER_TOOLS: "power_tools",
  } as const;

  const route = useRoute();
  const components = ref<CalcResponseDTO[]>([]);
  const resultMatList = ref<ResultMaterialsDTO>({
    hand_tools: [],
    power_tools: [],
    materials: [],
  });

  function parseData(query: LocationQuery) {
    const { components, crew } = query;
    if (!components || typeof components !== "string") return {};
    return { components: JSON.parse(components), crew };
  }

  // fetch func
  async function calculateValues() {
    const { system } = route.params;
    const { components, crew } = parseData(route.query);
    if (!components || !crew) return [];
    const dataToSend = { components, crew };
    const data = await BaseModel.post<CalcResponseDTO[]>({
      params: `/calc/${system}`,
      body: dataToSend,
    });
    return data || [];
  }

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    const values = await calculateValues();
    components.value = [...values];
    event.target.complete();
  }

  function mergeMaterials(
    material: (typeof MATERIALS_KEYS)[keyof typeof MATERIALS_KEYS],
    event: Event
  ) {
    resultMatList.value = Object.assign({}, resultMatList.value, {
      [material]: event,
    });
  }

  onMounted(async () => {
    const values = await calculateValues();
    components.value = values;
  });
</script>

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
        @modal="(e) => openModal('materials', e)"
        :components="components"
      />

      <HandToolComponent
        @modal="(e) => openModal('hand_tools', e)"
        :components="components"
      />

      <PowerToolComponent
        @modal="(e) => openModal('power_tools', e)"
        :components="components"
      />
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import { onMounted, ref } from "vue";
  import { LocationQuery, useRoute } from "vue-router";
  import type {
    CalcResponseDTO,
    HandTool,
    Material,
    PowerTool,
  } from "@/types/dto/index";
  type ModalKey = "hand_tools" | "power_tools" | "materials";

  import { modalController, RefresherCustomEvent } from "@ionic/vue";

  import BaseModel from "@/models/BaseModel";
  import MaterialComponent from "@/components/pagesParts/materials/MaterialComponent.vue";
  import HandToolComponent from "@/components/pagesParts/handTools/HandToolComponent.vue";
  import PowerToolComponent from "@/components/pagesParts/powerTools/PowerToolComponent.vue";
  import HandToolModal from "@/components/pagesParts/handTools/HandToolModal.vue";
  import PowerToolModal from "@/components/pagesParts/powerTools/PowerToolModal.vue";
  import MaterialModal from "@/components/pagesParts/materials/MaterialModal.vue";

  const route = useRoute();
  const components = ref<CalcResponseDTO[]>([]);
  const modals = {
    hand_tools: HandToolModal,
    power_tools: PowerToolModal,
    materials: MaterialModal,
  };

  const openModal = async (
    key: ModalKey,
    item: {
      id: number;
      material: Material | HandTool | PowerTool;
    }
  ) => {
    const { id, material } = item;
    console.log(material);
    const modal = await modalController.create({
      component: modals[key],
      componentProps: { id, material },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss<{
      id: number;
      material: Material | HandTool | PowerTool;
    }>();

    // console.log(data?.material, key);
    if (!data?.material || !role) return;

    components.value.forEach((component) => {
      if (component.id !== data.id) return;

      const { material } = data;

      if (isMaterial(material)) {
        handleMaterialUpdate(material, component, role);
      } else if (isPowerTool(material)) {
        handleMaterialUpdate(key, material, component, role);
      } else if (isHandTool(material)) {
        handleMaterialUpdate(key, material, component, role);
      }
    });
  };

  function handleMaterialUpdate(
    material: Material,
    component: CalcResponseDTO,
    role: string
  ) {
    const itemIndex = component.materials.findIndex(
      (mat) => mat.ru_title === material.ru_title
    );
    if (itemIndex === -1) {
      component.materials.push(material as Material);
    } else if (role === "confirm" && material) {
      component.materials[itemIndex] = { ...material };
    } else if (role === "remove") {
      component.materials.splice(itemIndex, 1);
    }
  }

  function isHandTool(item: object): item is HandTool {
    return "adjusted_consumption" in item && "ru_title" in item;
  }

  function isPowerTool(item: object): item is PowerTool {
    return "corded" in item;
  }

  function isMaterial(item: object): item is Material {
    return "consumption" in item && "volume" in item && "measure" in item;
  }

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
    const data = await BaseModel.post<CalcResponseDTO[]>(
      `/calc/${system}`,
      [],
      {
        body: JSON.stringify(dataToSend),
      }
    );
    return data || [];
  }

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    const values = await calculateValues();
    components.value = [...values];
    event.target.complete();
  }

  onMounted(async () => {
    const values = await calculateValues();
    components.value = values;
  });
</script>

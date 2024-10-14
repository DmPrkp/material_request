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
        @modal="openMaterialModal"
        :components="components"
      />

      <HandToolComponent
        @modal="openHandToolModal"
        :components="components"
      />

      <PowerToolComponent
        @modal="openPowerToolModal"
        :components="components"
      />
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import { onMounted, ref } from "vue";
  import { LocationQuery, useRoute } from "vue-router";
  import type { CalcResponseDTO, HandTool, Material } from "@/types/dto/index";

  import { modalController, RefresherCustomEvent } from "@ionic/vue";

  import BaseModel from "@/models/BaseModel";
  import MaterialComponent from "@/components/ui/materials/MaterialComponent.vue";
  import HandToolComponent from "@/components/ui/handTools/HandToolComponent.vue";
  import PowerToolComponent from "@/components/ui/powerTools/PowerToolComponent.vue";
  import HandToolModal from "@/components/ui/handTools/HandToolModal.vue";
  import PowerToolModal from "@/components/ui/powerTools/PowerToolModal.vue";
  import MaterialModal from "@/components/ui/materials/MaterialModal.vue";

  const route = useRoute();

  const components = ref<CalcResponseDTO[]>([]);

  const openHandToolModal = async (tool: HandTool) => {
    const modal = await modalController.create({
      component: HandToolModal,
      componentProps: { tool },
    });

    modal.present();

    const { data, role } = await modal.onWillDismiss();

    console.log(data.title, role);
    if (role === "confirm") {
      // message.value = `Hello, ${data.title}!`;
    }
  };

  const openPowerToolModal = async (tool: HandTool) => {
    const modal = await modalController.create({
      component: PowerToolModal,
      componentProps: { tool },
    });

    modal.present();

    const { data, role } = await modal.onWillDismiss();

    console.log(data.title, role);
    if (role === "confirm") {
      // message.value = `Hello, ${data.title}!`;
    }
  };

  const openMaterialModal = async (material: Material) => {
    const modal = await modalController.create({
      component: MaterialModal,
      componentProps: { material },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    components.value.forEach((component) => {
      const materialIndex = component.materials.findIndex(
        (mat) => mat.id === material.id
      );

      if (materialIndex === -1) return;

      if (role === "confirm" && data) {
        component.materials[materialIndex] = { ...data };
      } else if (role === "confirm" && data === null) {
        component.materials.splice(materialIndex, 1);
      }
    });
  };

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

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
      <MaterialComponent :components="components" />
      <HandToolComponent :components="components" />
      <PowerToolComponent :components="components" />
      <ion-button
        shape="round"
        fill="outline"
        color="medium"
        @click="check()"
      >
        Создать заявку
      </ion-button>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import { onMounted, ref } from "vue";
  import { LocationQuery, useRoute } from "vue-router";
  import type { CalcResponseDTO } from "@/types/dto/index";
  import { RefresherCustomEvent } from "@ionic/vue";
  import BaseModel from "@/models/BaseModel";
  import MaterialComponent from "@/components/pagesParts/materials/MaterialComponent.vue";
  import HandToolComponent from "@/components/pagesParts/handTools/HandToolComponent.vue";
  import PowerToolComponent from "@/components/pagesParts/powerTools/PowerToolComponent.vue";

  const route = useRoute();
  const components = ref<CalcResponseDTO[]>([]);

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

  function check() {
    console.log(JSON.parse(JSON.stringify(components.value)));
  }

  onMounted(async () => {
    const values = await calculateValues();
    components.value = values;
  });
</script>

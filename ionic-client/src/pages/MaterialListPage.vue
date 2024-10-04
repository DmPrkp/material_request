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
          <ion-title size="large">
            {{ $t("pages.materials.title") }}
          </ion-title>
        </ion-item-divider>
      </div>

      <!-- <ion-grid > -->
      <ion-row class="custom-margin">
        <ion-col size="1"> № </ion-col>

        <ion-col size="5">
          <div>{{ $t(`pages.materials.table.title`) }}</div>
        </ion-col>

        <ion-col size="4">
          {{ $t(`pages.materials.table.consumption`) }}
        </ion-col>

        <ion-col size="2">
          {{ $t(`pages.materials.table.totalVolume`) }}
        </ion-col>
      </ion-row>
      <!-- </ion-grid> -->
      <!-- <ion-list> -->
      <ion-item-group
        v-for="component in materialsList"
        :key="component.id"
      >
        <ion-item-divider>
          <ion-label>
            {{ $t(`pages.components.items.${component.title}`) }}
          </ion-label>
        </ion-item-divider>
        <MaterialListItems :materials="component.materials" />
      </ion-item-group>
      <!-- </ion-list> -->
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref, toRaw } from "vue";
  import { LocationQuery, useRoute } from "vue-router";
  import type { CalcResponseDTO } from "@/types/dto/index";

  import { RefresherCustomEvent } from "@ionic/vue";
  import MaterialListItems from "@/components/ui/MaterialListItems.vue";
  import BaseModel from "@/models/BaseModel";

  const route = useRoute();

  const materialsList = ref<CalcResponseDTO[]>([]);

  onMounted(async () => {
    const values = await calculateValues();
    materialsList.value = values;
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
    event.target.complete();
  }
</script>

<style>
  .full-volume-block {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0 15px 0 15px;
  }

  .full-volume-block_input {
    flex: 1;
    --placeholder-width: 150px;
  }

  .custom-item {
    display: flex;
    align-items: center;
  }

  ion-label {
    flex: 1; /* Take available space */
    min-width: 250px; /* Minimum width of label */
    white-space: nowrap; /* Prevent text wrapping */
    overflow: hidden; /* Hide overflow text */
    text-overflow: ellipsis; /* Add ellipsis for overflow text */
  }

  ion-input {
    flex: 2; /* Adjust based on your layout needs */
  }

  .custom-margin {
    margin-left: 18px;
    margin-right: 18px;
  }
</style>

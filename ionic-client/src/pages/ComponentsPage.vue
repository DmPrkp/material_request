<template>
  <ion-page v-if="route.name === 'system'">
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
      <div class="full-volume-block">
        <ion-input
          class="full-volume-block_input"
          :disabled="!isValueToAll"
          :label="isValueToAll ? 'Общий объем:' : 'По слоям'"
          placeholder="_________"
          :value="allValue"
          type="number"
          @ionInput="setAllValue"
        />
        <ion-text>{{ $t("measure.square") }}</ion-text>
      </div>
      <ion-list>
        <ion-item
          v-for="(item, index) in pageComponents"
          :key="item.title + index"
          class="custom-item"
        >
          <ion-label>
            {{ $t(`pages.components.items.${item.title}`) }}
          </ion-label>
          <ion-input
            @ionInput="setVal($event, item.title)"
            type="number"
            :value="componentList[item.title]"
          />
          <ion-text justify="end">{{ $t("measure.square") }}</ion-text>
        </ion-item>
      </ion-list>
      <ion-item>
        <ion-label>
          {{ $t(`pages.components.crew-num`) + ":" }}
        </ion-label>
        <ion-input
          :disabled="!isValueToAll"
          placeholder="_______"
          type="number"
          :value="crew"
          @ionInput="setWorkerCrew"
        />
      </ion-item>
      <div class="ion-padding">
        <ion-button
          expand="full"
          @click="sendComponentsVal"
          >{{ $t("pages.components.send") }}</ion-button
        >
      </div>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";

  import {
    InputCustomEvent,
    RefresherCustomEvent,
    // ToggleCustomEvent,
  } from "@ionic/vue";
  import BaseModel from "@/models/calc/BaseCalcModel";
  import { ComponentsType } from "@/types";
  import { ComponentsList } from "./types";
  import { usePreloader } from "@/store";

  const route = useRoute();
  const router = useRouter();
  const preloader = usePreloader();
  preloader.setPreloader(true);

  const pageComponents = ref<ComponentsType[]>([]);
  const componentList: ComponentsList = reactive({});
  const isValueToAll = ref(true);
  const allValue = ref(100);
  const crew = ref(1);
  const componentsTitleIdMap: Record<string, number> = {};

  function setAllValue(value: InputCustomEvent) {
    const val = Number(value.detail.value || 0);
    allValue.value = val > 9999 ? 9999 : val;
    pageComponents.value.forEach(
      (component) => (componentList[component.title] = allValue.value)
    );
  }

  function setWorkerCrew(value: InputCustomEvent) {
    crew.value = Number(value.detail.value || 1);
  }

  function setVal(value: InputCustomEvent, item: string) {
    const val = Number(value.detail.value || 0);
    componentList[item] = val;
  }

  function setAllValues(components: ComponentsType[], val: number) {
    components.forEach((component: ComponentsType) => {
      componentsTitleIdMap[component.title] = component.id;
      componentList[component.title] = val;
    });
  }

  onMounted(async () => {
    await getComponents();
  });

  async function sendComponentsVal() {
    const components = Object.fromEntries(
      Object.keys(componentList).map((comp) => [
        String(componentsTitleIdMap[comp]),
        componentList[comp],
      ])
    );

    router.push({
      name: "material-list",
      query: { components: JSON.stringify(components), crew: crew.value },
    });
  }

  async function getComponents() {
    try {
      const { workType, system } = route.params;
      const responseComponents = await BaseModel.get<ComponentsType[]>(
        `/${workType}/${system}`
      );

      if (!responseComponents?.length) {
        console.warn("No components available for this system.");
        return;
      }

      pageComponents.value = responseComponents;
      setAllValues(responseComponents, allValue.value);
    } catch (error) {
      console.error("Error fetching components:", error);
    } finally {
      preloader.setPreloader(false);
    }
  }

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    await getComponents();
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
</style>

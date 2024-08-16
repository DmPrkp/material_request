<template>
  <ion-page>
    <ion-content>
      <ion-refresher
        slot="fixed"
        @ionRefresh="handleRefresh($event)"
      >
        <ion-refresher-content />
      </ion-refresher>
      <div class="ion-padding">
        <ion-title size="large">{{ $t("pages.components.title") }}</ion-title>
      </div>
      <ion-item>
        <ion-input
          style="width: 80%"
          :disabled="!isValueToAll"
          label="Общий объем: "
          placeholder="_______"
          type="number"
          @ionInput="setAllValue"
        />
        <ion-text justify="end">{{ $t("measure.square") }}</ion-text>
        <ion-toggle
          justify="start"
          :checked="isValueToAll"
          @ionChange="setIsAllValue"
        />
      </ion-item>
      <ion-list>
        <ion-item
          v-for="(item, index) in pageComponents"
          :key="item.title + index"
        >
          <ion-input
            :disabled="isValueToAll"
            @ionInput="setVal($event, item.title)"
            :label="$t(`pages.components.items.${item.title}`)"
            type="number"
            :value="componentList[item.title]"
          />
          <ion-text justify="end">{{ $t("measure.square") }}</ion-text>
        </ion-item>
      </ion-list>
      <ion-item>
        <ion-input
          :disabled="!isValueToAll"
          label="Количество звеньев рабочих: "
          placeholder="_______"
          type="number"
          :value="workerCrew"
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
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref, toRaw } from "vue";
  import { useRoute } from "vue-router";

  import {
    InputCustomEvent,
    RefresherCustomEvent,
    ToggleCustomEvent,
  } from "@ionic/vue";
  import BaseModel from "@/models/BaseModel";
  import { ComponentsType } from "@/types";
  import { ComponentsList } from "./types";

  const route = useRoute();
  // const router = useRouter();

  const pageComponents = ref<ComponentsType[]>([]);
  const componentList: ComponentsList = reactive({});
  const isValueToAll = ref(true);
  const allValue = ref(100);
  const workerCrew = ref(1);
  const componentsTitleIdMap: Record<string, number> = {};

  function setAllValue(value: InputCustomEvent) {
    const val = Number(value.detail.value || 0);
    allValue.value = val > 9999 ? 9999 : val;
    pageComponents.value.forEach(
      (component) => (componentList[component.title] = allValue.value)
    );
  }

  function setWorkerCrew(value: InputCustomEvent) {
    workerCrew.value = Number(value.detail.value || 1);
  }

  function setIsAllValue(val: ToggleCustomEvent) {
    isValueToAll.value = val.detail.checked;

    if (isValueToAll.value) {
      setAllValues(pageComponents.value, allValue.value);
    }
  }

  function setVal(value: InputCustomEvent, item: string) {
    const val = Number(value.detail.value || 0);
    componentList[item] = val;
  }

  function setAllValues(components: ComponentsType[], val: any) {
    components.forEach((component: ComponentsType) => {
      componentsTitleIdMap[component.title] = component.id;
      componentList[component.title] = val;
    });
  }

  onMounted(async () => {
    await getComponents();
  });

  // fetch func
  async function sendComponentsVal() {
    const { system } = route.params;
    let components = toRaw(componentList);
    components = Object.keys(components).reduce<Record<string, number>>(
      (acc, comp) => {
        acc[String(componentsTitleIdMap[comp])] = components[comp];
        return acc;
      },
      {}
    );
    const dataToSend = { components, workerCrews: workerCrew.value };
    await BaseModel.post(`/calc/${system}`, [], {
      body: JSON.stringify(dataToSend),
    });
  }

  async function getComponents() {
    const { workType, system } = route.params;
    const responseComponents = await BaseModel.get<ComponentsType[]>(
      `/${workType}/${system}`
    );
    if (responseComponents) {
      pageComponents.value = responseComponents;
      setAllValues(responseComponents, 0);
    } else {
      throw new Error("No components to this system");
    }
  }

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    await getComponents();
    event.target.complete();
  }
</script>

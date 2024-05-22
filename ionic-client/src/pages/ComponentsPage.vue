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
        <ion-toggle
          style="width: 20%"
          justify="start"
          :checked="isValueToAll"
          @ionChange="setIsAllValue"
        />
        <ion-input
          style="width: 80%"
          :disabled="!isValueToAll"
          label="Общий объем"
          placeholder="_______"
          type="number"
          @ionInput="setAllValue"
        />
        <ion-text justify="end">{{ $t("measure.square") }}</ion-text>
      </ion-item>
      <ion-list>
        <ion-item
          v-for="(item, index) in pageComponents"
          :key="item + index"
        >
          <ion-input
            :disabled="isValueToAll"
            @ionInput="setVal($event, item)"
            :label="$t(`pages.components.items.${item}`)"
            type="number"
            :value="systemsVolumes[item]"
          />
          <ion-text justify="end">{{ $t("measure.square") }}</ion-text>
        </ion-item>
      </ion-list>
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
  interface ISystemsVolumes {
    [key: string]: number | string | null | undefined;
  }
  import { onMounted, reactive, ref, toRaw } from "vue";
  import { useRoute } from "vue-router";

  import {
    InputCustomEvent,
    RefresherCustomEvent,
    ToggleCustomEvent,
  } from "@ionic/vue";
  import BaseModel from "@/models/BaseModel";

  const route = useRoute();
  // const router = useRouter();

  const pageComponents = ref([]);
  const isValueToAll = ref(true);
  const allValue = ref(100);
  const systemsVolumes: ISystemsVolumes = reactive({});

  function setAllValue(val: any) {
    allValue.value = val.detail.value > 9999 ? 9999 : val.detail.value;
    Object.keys(systemsVolumes).forEach(
      (component) => (systemsVolumes[component] = allValue.value)
    );
  }
  function setIsAllValue(val: ToggleCustomEvent) {
    isValueToAll.value = val.detail.checked;
    if (isValueToAll.value)
      setAllVolumes(Object.keys(systemsVolumes), allValue.value);
  }

  function setVal(val: InputCustomEvent, item: string) {
    systemsVolumes[item] = val.detail.value;
  }

  async function handleRefresh(event: RefresherCustomEvent) {
    await getComponents();
    event.target.complete();
  }

  async function getComponents() {
    const { components, systems } = route.params;
    const systemsParam = Array.isArray(systems) ? systems.join("/") : systems;
    const componentsParam = Array.isArray(components)
      ? components.join("/")
      : components;
    const responseSystems = await BaseModel.get([
      systemsParam,
      componentsParam,
    ]);
    pageComponents.value = responseSystems;
    setAllVolumes(responseSystems, "");
  }

  function setAllVolumes(components: Array<string>, val: any) {
    components.forEach((component: string) => {
      systemsVolumes[component] = val;
    });
  }

  async function sendComponentsVal() {
    // TODO: set
    const vol = toRaw(systemsVolumes);
    await BaseModel.post(["calc_val"], [], {
      body: JSON.stringify(vol),
    });
  }

  onMounted(async () => {
    console.log("onMounted");
    await getComponents();
  });
</script>

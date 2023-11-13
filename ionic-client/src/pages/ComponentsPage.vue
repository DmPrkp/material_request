<template>
  <ion-page>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>
      <div class="ion-padding">
        <ion-title size="large">{{ $t("pages.components.title") }}</ion-title>
      </div>
      <ion-item>
        <ion-toggle style="width: 20%;" justify="start" :checked="isValueToAll" @ionChange="setIsAllValue" /><br /><br />
        <ion-input style="width: 80%;" :disabled="!isValueToAll" label="Общий объем" :value="allValue" type="number" @ionInput="setAllValue" />
        <ion-text justify="end">{{ $t("measure.square") }}</ion-text>
      </ion-item>
      <ion-list>
        <ion-item v-for="(item, index) in pageComponents" :key="item + index">
          <ion-input :disabled="isValueToAll" :label="$t(`pages.components.items.${item}`)" type="number" :value="allValue" />
          <ion-text justify="end">{{ $t("measure.square") }}</ion-text>
        </ion-item>
      </ion-list>
      <div class="ion-padding">
        <ion-button expand="full">{{ $t("pages.components.send") }}</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { RefresherCustomEvent } from '@ionic/vue';
import BaseModel from '@/models/BaseModel';

const route = useRoute();
// const router = useRouter();

const pageComponents = ref([]);
const isValueToAll = ref(true);
const allValue = ref(100);

function setAllValue(val: any) { allValue.value = (val.detail.value > 9999) ? 9999 : val.detail.value; }
function setIsAllValue(val: any) { console.log(val.detail.checked); isValueToAll.value = val.detail.checked; }

async function handleRefresh(event: RefresherCustomEvent) {
  await getComponents();
  event.target.complete();
}

async function getComponents() {
  const { components, systems } = route.params;
  const systemsParam = Array.isArray(systems) ? systems.join('/') : systems;
  const componentsParam = Array.isArray(components) ? components.join('/') : components;
  const responseSystems = await BaseModel.fetch([systemsParam, componentsParam]);
  pageComponents.value = responseSystems;
}

onMounted(async () => {
  await getComponents();
});
</script>

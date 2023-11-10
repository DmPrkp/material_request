<template>
    <ion-page>
        <ion-title> Заполните объемы работ: </ion-title>
        <ion-content>
        <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
            <ion-refresher-content></ion-refresher-content> 
        </ion-refresher>

        <ion-item>
            <ion-input style="width: 80%;" :disabled="!isValueToAll" label="Общий объем" :value="allValue" type="number" @ionInput="setAllValue"></ion-input>        
            <ion-toggle style="width: 20%;" justify="end" :checked="isValueToAll" @ionChange="setIsAllValue">{{ $t("measure.square") }}</ion-toggle><br /><br />
        </ion-item>        
        <ion-list>
            <ion-item v-for="item in pageComponents">
                <ion-input :disabled="isValueToAll" :label="$t(`components.${item}`)" type="number" :value="allValue" ></ion-input>
                <ion-text justify="end">{{ $t("measure.square") }}</ion-text>
            </ion-item>
        </ion-list>
    </ion-content>
    </ion-page>

</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute()
const router = useRouter()


import BaseModel from '@/models/BaseModel'

const pageComponents = ref([])
const isValueToAll = ref(true)
const allValue = ref(100)

function setAllValue(val: any) { allValue.value = (val.detail.value > 9999) ? 9999 : val.detail.value }
function setIsAllValue(val: any) { console.log(val.detail.checked); isValueToAll.value = val.detail.checked }

async function handleRefresh(event: CustomEvent) {
    await getComponents()
    event.target.complete()
}

async function getComponents() {
    const { components, systems } = route.params
    const systemsParam = Array.isArray(systems) ? systems.join('/') : systems;
    const componentsParam = Array.isArray(components) ? components.join('/') : components;
    const responseSystems = await BaseModel.fetch([systemsParam, componentsParam])
    pageComponents.value = responseSystems
}

onMounted(async ()=> {
    await getComponents()
})
</script>
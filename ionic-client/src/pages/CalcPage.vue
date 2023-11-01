<template>
    <ion-page>
        <CalcItem v-for="(item, index) in mainMenu" :key="index" :item="item" @click="openChild(item)"/>
    </ion-page>
</template>

<script lang="ts" setup>
import { IonPage } from '@ionic/vue';
import { ref, onMounted, reactive, type Ref, toRefs } from 'vue';
import { type MainMenuItem } from '../../../shared-types/controller/main-menu'
import CalcItem from '@/components/ui/CalcItem.vue';
import BaseModel from '@/models/BaseModel'

const mainMenu : Ref<Array<MainMenuItem>> = ref([])

function openChild(e: MainMenuItem) {
    mainMenu.value = e.items
}
onMounted(async () => {
  mainMenu.value = await BaseModel.fetch(['main-menu'])
});
</script>

<style scoped>
.calc-page {
    display: flex;
    justify-content: center;
}
</style>
  
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

const mainMenu : Ref<Array<MainMenuItem>> = ref([])

function openChild(e: MainMenuItem) {
    mainMenu.value = e.items
}
onMounted(async () => {
    try {
    const response = await fetch('http://localhost:3000/api/v1/main-menu', { mode: 'no-cors' });
    if (response.ok) {
      mainMenu.value = await response.json();
    } else {
      console.error('Request failed with status:', response.status);
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
});
</script>

<style scoped>
.calc-page {
    display: flex;
    justify-content: center;
}
</style>
  
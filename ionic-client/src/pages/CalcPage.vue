<template>
    <div class="calc-page">
        <CalcItem v-for="(item, index) in mainMenu" :key="index" :item="item" @click="openChild(item)"/>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, reactive, type Ref, toRefs } from 'vue';
import { type MainMenuItem } from '../../../shared-types/controller/main-menu'
import CalcItem from '@/components/ui/CalcItem.vue';

const mainMenu : Ref<Array<MainMenuItem>> = ref([])

function openChild(e: MainMenuItem) {
    console.log(e.items);
    mainMenu.value = e.items
}
// onMounted(async () => {
//   const response = await fetch('http://localhost:3000/api/v1/main-menu')
//   console.log(response)
//   if (response) mainMenu.value = await response.json()
// });
</script>

<style scoped>
.calc-page {
    display: flex;
    justify-content: center;
}
</style>
  
<template>
    <div class="calc-page">
        <CalcItem v-for="(item, index) in mainMenu" :key="index" :item="item" @click="openChild"/>
        <!-- <input v-model="number1" type="number" placeholder="Enter a number" />
        <input v-model="number2" type="number" placeholder="Enter another number" />
        <button @click="addNumbers">Add</button>
        <p>Result: {{ result }}</p> -->
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, reactive, type Ref } from 'vue';
import { type MainMenuItem } from '../../../shared-types/controller/main-menu'
import CalcItem from '@/components/ui/CalcItem.vue';

const number1 = ref(0);
const number2 = ref(0);
const result = ref(0);
const mainMenu : Ref<Array<MainMenuItem>> = ref([])

const addNumbers = (): void => {
    result.value = number1.value + number2.value;
};

function openChild(e) {
    console.log(e)
}

onMounted(async () => {
  const response = await fetch('http://localhost:3000/api/v1/main-menu')
  const body = await response.json()
  console.log(body)
  mainMenu.value = body
});
</script>

<style scoped>
.calc-page {
    display: flex;
    justify-content: center;
}
</style>
  
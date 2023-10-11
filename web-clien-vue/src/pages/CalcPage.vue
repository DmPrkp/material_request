<template>
    <div>
        <div v-for="(item, index) in mainMenu" :key="index">
            <img :src="item.img.src" :alt="item.img.alt" :width="item.img.width">
        </div>
        <input v-model="number1" type="number" placeholder="Enter a number" />
        <input v-model="number2" type="number" placeholder="Enter another number" />
        <button @click="addNumbers">Add</button>
        <p>Result: {{ result }}</p>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, reactive, type Ref } from 'vue';
import { type MainMenuItem } from '../../../shared-types/controller/main-menu'

const number1 = ref(0);
const number2 = ref(0);
const result = ref(0);
const mainMenu : Ref<Array<MainMenuItem>> = ref([])

const addNumbers = (): void => {
    result.value = number1.value + number2.value;
};

onMounted(async () => {
  const response = await fetch('http://localhost:3000/api/v1/main-menu')
  const body = await response.json()
  console.log(body)
  mainMenu.value = body
});
</script>

<style scoped>
/* Add any styling you want for the component */
</style>
  
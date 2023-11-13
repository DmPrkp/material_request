<template>
  <div>
    <input v-model="number1" type="number" placeholder="Enter a number" />
    <input v-model="number2" type="number" placeholder="Enter another number" />
    <button @click="addNumbers">Add</button>
    <p>Result: {{ result }}</p>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const number1 = ref(0);
const number2 = ref(0);
const result = ref(0);

const addNumbers = (): void => {
  result.value = number1.value + number2.value;
};
</script>

<style scoped>
/* Add any styling you want for the component */
</style>

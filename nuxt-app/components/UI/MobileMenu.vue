<template lang="pug">
div
  div(
      :class="{'close': !isOpen}"
      class="burger"
      @click="click"
      )
    div(class="patty")
    div(class="patty")
    div(class="patty")
</template>

<script setup lang="ts">
const emit = defineEmits(['change'])
let isOpen = ref(false)

function click() {
  isOpen.value = !isOpen.value;
  emit('change', isOpen)
}
</script>
<style scoped lang="stylus">
.burger
  //position: absolute;
  //z-index: 10;
  //right: 20px;
  //top: 16px;
  cursor: pointer;
  transform: rotateY(0);
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);

.burger .patty
  width: 38px;
  height: 4px;
  margin: 0 0 8px 0;
  background: var(--main-color)
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
.burger > div:nth-child(3)
  margin: 0 0 0 0;

.close div:nth-child(1)
  transform: rotate(45deg) translate(5px,12px);
  background: var(--bright-letter)

.close div:nth-child(2)
  opacity: 0;

.close > div:nth-child(3)
  transform: rotate(-45deg) translate(6px, -12px);
  background: var(--bright-letter)
</style>

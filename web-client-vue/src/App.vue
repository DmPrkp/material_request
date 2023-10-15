<template>
    <HeaderBar @change="setBarState"/>
    <NavBar v-if="navBarState"/>
    <div style="padding: 20px;">
      <RouterView/>
    </div>

</template>

<script setup lang="ts">
import NavBar from './components/nav/NavBar.vue';
import HeaderBar from './components/nav/HeaderBar.vue';
import { ref, provide, onMounted } from 'vue'

let navBarState = ref(false)
let isMobile = ref(false)
let setBarState = () => { console.log('setBarState'); navBarState.value = !navBarState.value }

provide('isMobile', isMobile)

onMounted(() => {
  isMobile.value = window.innerWidth < 900
  if (!isMobile.value) { navBarState.value = true }
})

</script>

<style>
@import "@/assets/css";
@import "@/assets/css/main.css";
</style>
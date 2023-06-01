<template>
    <HeaderBar/>
    <NavBar/>
    <RouterView/>
</template>

<script setup lang="ts">
import NavBar from './components/nav/NavBar.vue';
import HeaderBar from './components/nav/HeaderBar.vue';
</script>

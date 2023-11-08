<template>
    <ion-content>
        <div></div>
    </ion-content>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute()
const router = useRouter()
const { components, systems } = route.params

import BaseModel from '@/models/BaseModel'

onMounted(async ()=> {
    const systemsParam = Array.isArray(systems) ? systems.join('/') : systems;
    const componentsParam = Array.isArray(components) ? components.join('/') : components;
    console.log(systemsParam, componentsParam)
    await BaseModel.fetch([systemsParam, componentsParam])
})
</script>
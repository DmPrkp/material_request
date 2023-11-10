<template>
    <ion-page v-if="route.name === 'systems'">
        <ion-content  class="ion-padding">
            <ion-title> Выберите технологию </ion-title>
            <main-menu-items v-if="currentItems[0]" :items="currentItems[0].items" @item="chooseItem"/>
        </ion-content>
    </ion-page>
    <ion-router-outlet v-else></ion-router-outlet>
</template>

<script lang="ts" setup>
import { computed, onMounted, ComputedRef } from 'vue';
import { type MainMenuItem } from '../../../shared-types/controller/main-menu'
import { useMainMenuStore } from '@/store/MainMenuStore'
const mainMenuStore = useMainMenuStore()
import MainMenuItems from '@/components/ui/MainMenuItems.vue'
import { useRoute, useRouter } from 'vue-router';
const route = useRoute()
const router = useRouter()
const currentItems : ComputedRef<Array<MainMenuItem>> = computed(() => mainMenuStore.mainMenu.filter(item => item.title === route.params.systems))

function chooseItem(item: MainMenuItem) {
    router.push({ name: 'components', params: { components: item.title } })
} 
</script>
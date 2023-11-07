<template>
    <ion-content v-if="route.name === 'systems'" class="ion-padding">
        <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
            <ion-refresher-content></ion-refresher-content> 
        </ion-refresher>
        <ion-title> Выберите технологию </ion-title>
        <main-menu-items v-if="currentItems[0]" :items="currentItems[0].items" @item="chooseItem"></main-menu-items>
    </ion-content>
    <ion-router-outlet v-else></ion-router-outlet>
</template>

<script lang="ts" setup>
import BaseModel from '@/models/BaseModel'
import { computed, onMounted, ComputedRef } from 'vue';
import { type MainMenuItem } from '../../../shared-types/controller/main-menu'
import { mainMenuStore } from '@/store/MainMenuStore'
const store = mainMenuStore()
import MainMenuItems from '@/components/ui/MainMenuItems.vue'
import { useRoute, useRouter } from 'vue-router';
const route = useRoute()
const router = useRouter()
const currentItems : ComputedRef<Array<MainMenuItem>> = computed(() => store.mainMenu.filter(item => item.title === route.params.systems))

const handleRefresh = (event: CustomEvent) => {
        setTimeout(() => {
          event.target.complete();
        }, 2000);
      };

function chooseItem(item: MainMenuItem) {
    router.push({ name: 'components', params: { systems: item.title } })
} 
</script>
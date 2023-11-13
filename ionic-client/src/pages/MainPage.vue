<template>
    <ion-page v-if="route.name === 'main'">
        <ion-content class="ion-padding">
            <ion-title v-if="mainMenu.length"> Выберите вид работ </ion-title>
            <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
                <ion-refresher-content></ion-refresher-content> 
            </ion-refresher>
            <main-menu-items :items="mainMenu" @item="chooseItem"></main-menu-items>
        </ion-content>
    </ion-page>

    <ion-router-outlet v-else></ion-router-outlet>
</template>

<script lang="ts" setup>
import BaseModel from '@/models/BaseModel'
import { computed, onMounted, reactive, type Ref, toRefs, type ComputedRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const router = useRouter()
const route = useRoute()
import { type MainMenuItem } from '../../../shared-types/controller/main-menu'
import { useMainMenuStore } from '@/store/MainMenuStore'
import MainMenuItems from '@/components/ui/MainMenuItems.vue'
import { RefresherCustomEvent } from '@ionic/vue';
const mainMenuStore = useMainMenuStore()

const mainMenu : ComputedRef<Array<MainMenuItem>> = computed(() => mainMenuStore.mainMenu)

async function getMainMenu() {
    const menu = await BaseModel.fetch(['main-menu'])
    mainMenuStore.defineMeinMenu(menu)
}

const handleRefresh = async (event: RefresherCustomEvent) => {
    mainMenuStore.clearMeinMenu()
    await getMainMenu()
    event.target.complete()
}



onMounted(async () => {
    await getMainMenu()
});

const chooseItem = (item : MainMenuItem) => {
    router.push({ name: 'systems', params: { systems: item.title } })
}
</script>
  
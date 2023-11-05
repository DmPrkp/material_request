<template>
    <ion-content class="ion-padding">
        <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
            <ion-refresher-content></ion-refresher-content> 
        </ion-refresher>
        <ion-title v-if="mainMenu.length"> Выберите вид работ </ion-title>
        <main-menu-items :items="[]"></main-menu-items>
    </ion-content>
</template>

<script lang="ts" setup>
import BaseModel from '@/models/BaseModel'
import { IonContent, IonRefresher, IonRefresherContent, IonTitle  } from '@ionic/vue';
import { computed, onMounted, reactive, type Ref, toRefs, type ComputedRef } from 'vue';
import { type MainMenuItem } from '../../../shared-types/controller/main-menu'
import { mainMenuStore } from '@/store/MainMenuStore'
import MainMenuItems from '@/components/ui/MainMenuItems.vue'
const store = mainMenuStore()

const mainMenu : ComputedRef<Array<MainMenuItem>> = computed(() => store.mainMenu)

const handleRefresh = (event: CustomEvent) => {
        setTimeout(() => {
          event.target.complete();
        }, 2000);
      };

onMounted(async () => {
    console.log('mainMenu', store.mainMenu)
});
</script>
<template>
    <ion-page>
        <ion-content class="ion-padding">
            <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
                <ion-refresher-content></ion-refresher-content> 
            </ion-refresher>
            <ion-grid>
                <ion-row>
                    <ion-col size-xs="6" size-md="6" size-lg="4" v-for="(item, index) in mainMenu" :key="index" :item="item" @click="openChild(item)">
                        <ion-card>
                            <img :src="item.img.src" :alt="item.img.alt" />
                            <ion-card-header>
                            <ion-card-title>{{ $t(`main-menu.${item.title}`) }}</ion-card-title>
                            </ion-card-header>
                        </ion-card>
                    </ion-col>
                </ion-row>
            </ion-grid>
        </ion-content>

        <!-- <CalcItem v-for="(item, index) in mainMenu" :key="index" :item="item" @click="openChild(item)"/> -->
    </ion-page>
</template>

<script lang="ts" setup>
import { IonPage, IonCard, IonCardHeader, IonCardTitle, IonContent, IonRefresher, IonRefresherContent, IonGrid, IonRow, IonCol  } from '@ionic/vue';
import { ref, onMounted, reactive, type Ref, toRefs } from 'vue';
import { type MainMenuItem } from '../../../shared-types/controller/main-menu'
// import CalcItem from '@/components/ui/CalcItem.vue';
import BaseModel from '@/models/BaseModel'

const mainMenu : Ref<Array<MainMenuItem>> = ref([])

function openChild(e: MainMenuItem) {
    mainMenu.value = e.items
}

const handleRefresh = (event: CustomEvent) => {
        setTimeout(() => {
          event.target.complete();
        }, 2000);
      };
onMounted(async () => {
  mainMenu.value = await BaseModel.fetch(['main-menu'])
});
</script>

<style scoped>
.calc-page {
    display: flex;
    justify-content: center;
}
</style>
  
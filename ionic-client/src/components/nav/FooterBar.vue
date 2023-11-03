<template>
  <ion-footer>
      <ion-grid>
        <ion-row >
            <ion-col no-padding class="ion-align-self-end">
              <router-link :to="`/${'ru'}/about`">
                <ion-icon :icon="informationCircleOutline" size="large"></ion-icon>
              </router-link>
              <ion-text class="small-text">
                О проекте
              </ion-text>
            </ion-col>
            <ion-col no-padding class="ion-align-self-end">
                <router-link :to="`/${'ru'}/calc`">
                  <ion-icon :icon="calculatorOutline" size="large"></ion-icon>
                </router-link>
                <ion-text class="small-text">
                  Калькулятор
                </ion-text>
            </ion-col>
            <ion-col no-padding class="ion-align-self-end">
              <router-link :to="`/${'ru'}/settings`">
                <ion-icon :icon="settingsOutline" size="large"></ion-icon>
              </router-link>
              <ion-text class="small-text">
                Настройки
              </ion-text>            
            </ion-col>
        </ion-row>
      </ion-grid>
  </ion-footer>
</template>

<script setup lang="ts">
import { IonIcon, IonFooter, IonGrid, IonCol, IonText, IonRow, IonFabButton, IonRippleEffect } from '@ionic/vue';
import { calculatorOutline, settingsOutline, informationCircleOutline } from 'ionicons/icons';

</script>

<style>
ion-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
</style>
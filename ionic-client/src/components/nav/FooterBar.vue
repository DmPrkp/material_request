<template>
  <ion-footer>
      <ion-grid>
        <ion-row >
            <ion-col no-padding class="ion-align-self-end">
              <ion-fab-button size="small" fill="outline">
                <ion-ripple-effect></ion-ripple-effect>
                <ion-icon :icon="informationCircleOutline"></ion-icon>
              </ion-fab-button>
              <ion-text class="small-text">
                О проекте
              </ion-text>
            </ion-col>
            <ion-col no-padding class="ion-align-self-end">
              <ion-fab-button fill="outline" class="ion-margin-bottom">
                <ion-ripple-effect></ion-ripple-effect>
                <ion-icon :icon="calculatorOutline"></ion-icon>
              </ion-fab-button>
              <ion-text class="small-text">
                Калькулятор
              </ion-text>
            </ion-col>
            <ion-col no-padding class="ion-align-self-end">
              <ion-fab-button size="small" fill="outline">
                <ion-ripple-effect></ion-ripple-effect>
                <ion-icon :icon="settingsOutline"></ion-icon>
              </ion-fab-button>
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
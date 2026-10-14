<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>
          <h1>{{ $t("footer.settings") }}</h1>
        </ion-title>
      </ion-item-divider>
      <ion-list>
        <LocaleSwitch />
        <ThemeSwitch />
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  /** Раздел настроек: язык и тема. Открывается из бокового меню, адрес — /settings. */
  import {
    IonContent,
    IonItemDivider,
    IonList,
    IonPage,
    IonTitle,
  } from "@ionic/vue";
  import LocaleSwitch from "@/components/logicalSwitchers/LocaleSwitch.vue";
  import ThemeSwitch from "@/components/logicalSwitchers/ThemeSwitch.vue";
</script>

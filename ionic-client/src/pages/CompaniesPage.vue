<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>
          <h1>{{ $t("footer.companies") }}</h1>
        </ion-title>
      </ion-item-divider>
      <SettingsCompanies />
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  /** Раздел компаний: текущая, смена и добавление — в боковом меню это была карточка. */
  import { IonContent, IonItemDivider, IonPage, IonTitle } from "@ionic/vue";
  import SettingsCompanies from "@/components/nav/SettingsCompanies.vue";
</script>

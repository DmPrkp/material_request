<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button
          color="medium"
          @click="cancel"
          >Cancel</ion-button
        >
      </ion-buttons>
      <ion-title>PowerToolModal</ion-title>
      <ion-buttons slot="end">
        <ion-button
          @click="confirm"
          :strong="true"
          >Confirm</ion-button
        >
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <div v-if="tool">
      <h3>{{ tool.ru_title }}</h3>
      <ul>
        <li
          v-for="(param, index) in tool.params"
          :key="index"
        >
          {{ param.param }} {{ param.measure }}
        </li>
      </ul>
    </div>
  </ion-content>
</template>

<script lang="ts" setup>
  import { PowerTool } from "@/types/dto";
  import { modalController } from "@ionic/vue";

  const param = defineProps<{
    tool: PowerTool;
  }>();

  const cancel = () => modalController.dismiss(null, "cancel");
  const confirm = () => modalController.dismiss(param.tool, "confirm");
</script>

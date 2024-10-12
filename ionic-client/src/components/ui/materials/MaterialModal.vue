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
      <ion-title>MaterialModal</ion-title>
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
    <div v-if="localMaterial">
      <ion-item>
        <ion-label position="floating">Title</ion-label>
        <ion-input
          v-model="localMaterial.title"
          placeholder="Enter title"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="floating">Russian Title (RU Title)</ion-label>
        <ion-input
          v-model="localMaterial.ru_title"
          placeholder="Enter Russian title"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="floating">Consumption</ion-label>
        <ion-input
          type="number"
          v-model="localMaterial.consumption"
          placeholder="Enter consumption"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="floating">Volume</ion-label>
        <ion-input
          type="number"
          v-model="localMaterial.volume"
          placeholder="Enter volume"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="floating">Measure</ion-label>
        <ion-input
          v-model="localMaterial.measure"
          placeholder="Enter measure"
        ></ion-input>
      </ion-item>

      <!-- <ion-item>
        <ion-label>Parameters</ion-label>
        <ion-list>
          <ion-item v-for="(param, index) in material.params" :key="index">
            <ion-label>{{ param.param }}</ion-label>
            <ion-input v-model="param.value" placeholder="Enter value"></ion-input>
          </ion-item>
        </ion-list>
      </ion-item> -->
    </div>
  </ion-content>
</template>

<script lang="ts" setup>
  import { Material } from "@/types/dto";
  import { modalController } from "@ionic/vue";
  import { ref } from "vue";

  const props = defineProps<{
    material: Material;
  }>();

  const localMaterial = ref({ ...props.material });

  const cancel = () => modalController.dismiss(null, "cancel");
  const confirm = () => modalController.dismiss(localMaterial, "confirm");
</script>

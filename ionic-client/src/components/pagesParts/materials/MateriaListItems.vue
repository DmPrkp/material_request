<template>
  <ion-item
    v-for="(material, num) in materials"
    :key="material.id"
    @click="setOpen(material)"
  >
    <ion-grid>
      <ion-row>
        <ion-col size="1">
          {{ num + 1 }}
        </ion-col>
        <ion-col
          size="6"
          class="ion-align-items-start ion-text-start"
        >
          {{ material.ru_title }}
          <span
            v-for="param in material.params"
            :key="param.param"
          >
            {{ param.param }} {{ $t(`measure.${param.measure}`) }} {{ " " }}
          </span>
        </ion-col>
        <ion-col size="3">
          {{ material.consumption }} {{ $t(`measure.${material.measure}`) }}
        </ion-col>
        <ion-col
          size="2"
          class="ion-text-right"
        >
          {{ (material.consumption * material.volume).toFixed(0) }}
          {{ $t(`measure.${material.measure}`) }}
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
</template>

<script setup lang="ts">
  import { Material } from "@/types/dto";

  defineProps<{
    materials: Material[];
  }>();

  const emit = defineEmits(["modal"]);

  const setOpen = (material: Material) => {
    emit("modal", material);
  };
</script>

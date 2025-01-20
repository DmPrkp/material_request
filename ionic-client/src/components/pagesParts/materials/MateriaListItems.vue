<template>
  <ion-item
    v-for="(material, num) in materials"
    :key="material.id"
    @click="setOpen(material)"
    style="cursor: pointer"
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
          {{ material.title }}
          <span
            v-for="param in material.params"
            :key="param.param"
          >
            {{ $t(`ui.paramsTitles.${param.title}`) }} {{ param.param }}
            {{ $t(`measure.${param.measure}`) }} {{ " " }}
          </span>
        </ion-col>
        <ion-col size="2">
          {{ material.consumption }}
        </ion-col>
        <ion-col
          size="2"
          class="ion-text-right"
        >
          {{ (material.consumption * material.volume).toFixed(0) }}
        </ion-col>
        <ion-col
          size="1"
          class="ion-text-right"
        >
          {{ material.measure }}
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

<template>
  <ion-item-divider color="secondary">
    <ion-title>
      {{ $t("pages.materials.subTitles.materials") }}
    </ion-title>
  </ion-item-divider>

  <ion-row class="custom-margin">
    <ion-col size="1"> № </ion-col>

    <ion-col size="7">
      <div>{{ $t(`pages.materials.table.title`) }}</div>
    </ion-col>

    <ion-col size="4">
      {{ $t(`pages.materials.table.consumption`) }}
    </ion-col>
  </ion-row>
  <ion-row class="custom-margin">
    <ion-col size="1"></ion-col>

    <ion-col size="7"> </ion-col>

    <ion-col size="2">
      {{ $t(`pages.materials.table.consumptionPerSq`) }}
    </ion-col>

    <ion-col size="2">
      {{ $t(`pages.materials.table.totalVolume`) }}
    </ion-col>
  </ion-row>
  <ion-item-group
    v-for="component in materials"
    :key="component.id"
  >
    <ion-item-divider>
      <ion-label>
        {{ $t(`pages.components.items.${component.title}`) }}
      </ion-label>
    </ion-item-divider>
    <MaterialListItems :materials="component.materials" />
  </ion-item-group>
</template>

<script lang="ts" setup>
  import MaterialListItems from "@/components/ui/MaterialListItems.vue";
  import { CalcResponseDTO } from "@/types/dto";

  defineProps<{
    materials: CalcResponseDTO[];
  }>();
</script>

<template>
  <ion-list>
    <ion-grid class="custom-margin">
      <ion-row>
        <ion-col size="1"> № </ion-col>

        <ion-col size="6">
          <div>{{ $t(`pages.materials.table.title`) }}</div>
        </ion-col>

        <ion-col
          size="3"
          class="ion-text-right"
        >
          {{ $t(`pages.materials.table.consumption`) }}
        </ion-col>

        <ion-col
          size="2"
          class="ion-text-right"
        >
          {{ $t(`pages.materials.table.totalVolume`) }}
        </ion-col>
      </ion-row>
    </ion-grid>

    <ion-item
      v-for="(material, num) in materials"
      :key="material.id"
    >
      <ion-grid>
        <ion-row>
          <ion-col size="1">
            {{ num + 1 }}
          </ion-col>
          <ion-col
            size="7"
            class="ion-align-items-start"
          >
            <div>
              {{ material.ru_title }}
              <span
                v-for="param in material.params"
                :key="param.param"
              >
                {{ param.param }} {{ $t(`measure.${param.measure}`) }} {{ " " }}
              </span>
            </div>
          </ion-col>

          <!-- Right side: adjusted consumption -->
          <ion-col
            size="2"
            class="ion-text-right"
          >
            {{ material.consumption }}
            {{ $t(`measure.${material.measure}`) }}
          </ion-col>
          <ion-col
            size="2"
            class="ion-text-right"
          >
            {{ material.consumption * material.volume }}
            {{ $t(`measure.${material.measure}`) }}
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
  import { Material } from "@/types/dto";

  defineProps<{
    materials: Material[];
  }>();
</script>

<style scoped>
  .custom-margin {
    margin-left: 18px;
    margin-right: 18px;
  }
</style>

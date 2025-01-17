<template>
  <ion-item-divider color="secondary">
    <ion-title>
      {{ $t("pages.materials.subTitles.materials") }}
    </ion-title>
  </ion-item-divider>

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

    <ion-col size="2">
      {{ $t(`ui.labels.measure`) }}
    </ion-col>
  </ion-row>

  <ion-row>
    <ion-col size="1"></ion-col>

    <ion-col
      size="6"
      class="ion-text-right"
    >
    </ion-col>

    <ion-col
      size="2"
      class="ion-text-right"
    >
      {{ $t(`pages.materials.table.consumptionPerSq`) }}
    </ion-col>

    <ion-col
      size="2"
      class="ion-text-right"
    >
      {{ $t(`pages.materials.table.totalVolume`) }}
    </ion-col>

    <ion-col size="1"></ion-col>
  </ion-row>
</template>

<script lang="ts" setup></script>

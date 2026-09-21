<template>
  <TitledDivider :title="$t('pages.materials.subTitles.materials')" />

  <!--
    Сохранённая заявка — только общий расход, одной строкой шапки; ширины столбцов
    те же, что у строк в MateriaListItems при readonly.
  -->
  <ion-row
    v-if="readonly"
    class="table-head"
  >
    <ion-col
      size="1"
      class="cell-center"
    >
      №
    </ion-col>

    <ion-col
      size="7"
      class="cell-center"
    >
      {{ $t(`pages.materials.table.title`) }}
    </ion-col>

    <ion-col
      size="2"
      class="cell-center"
    >
      {{ $t(`pages.materials.table.consumption`) }}
    </ion-col>

    <ion-col
      size="2"
      class="cell-center"
    >
      {{ $t(`ui.labels.measure`) }}
    </ion-col>
  </ion-row>

  <!-- Шапка по центру столбцов — как и числа в строках (MateriaListItems). -->
  <ion-row
    v-if="!readonly"
    class="table-head"
  >
    <ion-col
      size="1"
      class="cell-center"
    >
      №
    </ion-col>

    <ion-col
      size="6"
      class="cell-center"
    >
      <div>{{ $t(`pages.materials.table.title`) }}</div>
    </ion-col>

    <ion-col
      size="3"
      class="cell-center"
    >
      {{ $t(`pages.materials.table.consumption`) }}
    </ion-col>

    <ion-col
      size="2"
      class="cell-center"
    >
      {{ $t(`ui.labels.measure`) }}
    </ion-col>
  </ion-row>

  <ion-row
    v-if="!readonly"
    class="table-head"
  >
    <ion-col
      size="1"
      class="cell-center"
    ></ion-col>

    <ion-col
      size="6"
      class="cell-center"
    ></ion-col>

    <ion-col
      size="2"
      class="cell-center"
    >
      {{ $t(`pages.materials.table.consumptionPerSq`) }}
    </ion-col>

    <ion-col
      size="2"
      class="cell-center"
    >
      {{ $t(`pages.materials.table.totalVolume`) }}
    </ion-col>

    <ion-col
      size="1"
      class="cell-center"
    ></ion-col>
  </ion-row>
</template>

<script lang="ts" setup>
  import TitledDivider from "@/components/ui/TitledDivider.vue";

  defineProps<{ readonly?: boolean }>();
</script>

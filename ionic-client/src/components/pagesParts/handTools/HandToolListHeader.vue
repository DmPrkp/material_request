<template>
  <TitledDivider :title="$t('pages.materials.subTitles.handTools')" />

  <!-- Шапка по центру столбцов — как и числа в строках. -->
  <ion-row class="table-head">
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
      <div>{{ $t(`pages.materials.table.title`) }}</div>
    </ion-col>

    <!--
      В правке «расход» накрывает −, число, + и «шт»; в сохранённой заявке столбцы как
      у материалов (MaterialHeader): расход и ед.изм по 2, чтобы таблицы шли в линию.
    -->
    <ion-col
      :size="readonly ? 2 : 4"
      class="cell-center"
    >
      {{ $t(`pages.materials.table.consumption`) }}
    </ion-col>

    <ion-col
      v-if="readonly"
      size="2"
      class="cell-center"
    >
      {{ $t(`ui.labels.measure`) }}
    </ion-col>
  </ion-row>
</template>

<script lang="ts" setup>
  import TitledDivider from "@/components/ui/TitledDivider.vue";

  defineProps<{ readonly?: boolean }>();
</script>

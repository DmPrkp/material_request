<template>
  <TitledDivider :title="$t('pages.materials.subTitles.handTools')" />

  <ion-row>
    <ion-col size="1"> № </ion-col>

    <ion-col size="7">
      <div>{{ $t(`pages.materials.table.title`) }}</div>
    </ion-col>

    <ion-col size="4">
      {{ $t(`pages.materials.table.consumption`) }}
    </ion-col>
  </ion-row>
</template>

<script lang="ts" setup>
  import TitledDivider from "@/components/ui/TitledDivider.vue";
</script>

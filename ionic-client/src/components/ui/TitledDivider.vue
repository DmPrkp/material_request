<template>
  <ion-item-divider color="medium">
    <ion-title
      color="secondary"
      style="font-family: 'Impact'; font-weight: 900; font-style: oblique 10deg"
    >
      {{ title }}
    </ion-title>
  </ion-item-divider>
</template>

<script lang="ts" setup>
  defineProps<{
    title: string;
  }>();
</script>

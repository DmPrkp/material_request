<template>
  <ion-item-divider color="medium">
    <ion-title
      color="secondary"
      style="transform: skewX(-10deg)"
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

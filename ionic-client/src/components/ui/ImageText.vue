<template>
  <div
    v-if="text"
    class="inscription"
  >
    {{ $t(`ui.labels["${text}"]`) }}
  </div>
  <img
    :src="image.src"
    :alt="image.alt"
    :class="text ? 'grayscale-image' : ''"
  />
</template>

<script setup lang="ts">
  import { ImageType } from "@/types/entity/image";

  defineProps<{
    image: ImageType;
    text?: string;
  }>();
</script>

<style scoped>
  .inscription {
    position: absolute;
    top: 40%;
    left: 49%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    font-size: 1.25rem;
    z-index: 1;
    pointer-events: none;
  }

  .grayscale-image {
    filter: grayscale(100%);
  }
</style>

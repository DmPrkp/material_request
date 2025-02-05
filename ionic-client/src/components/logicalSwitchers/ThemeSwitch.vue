<template>
  <ion-button @click="toggleTheme">
    <ion-icon :icon="isDarkMode ? sunnyOutline : moonOutline"></ion-icon>
  </ion-button>
</template>

<script setup lang="ts">
  import { IonIcon } from "@ionic/vue";
  import { sunnyOutline, moonOutline } from "ionicons/icons";
  import { onBeforeMount, ref } from "vue";

  const isDarkMode = ref(false);

  const toggleTheme = (value: boolean | undefined) => {
    if (typeof value !== "boolean") value = !isDarkMode.value;
    isDarkMode.value = value;
    document.body.classList.toggle("dark", isDarkMode.value);
  };

  onBeforeMount(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      toggleTheme(true);
    }
  });
</script>

<template>
  <ion-button @click="toggleTheme">
    <ion-icon :icon="isDarkMode ? sunnyOutline : moonOutline"></ion-icon>
  </ion-button>
</template>

<script setup lang="ts">
  import { IonIcon } from "@ionic/vue";
  import { sunnyOutline, moonOutline } from "ionicons/icons";
  import { ref } from "vue";

  const isDarkMode = ref(false);

  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
    document.body.classList.toggle("dark", isDarkMode.value);
  };
</script>

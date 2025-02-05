<template>
  <ion-button @click="toggleTheme">
    <ion-icon :icon="isDarkMode ? sunnyOutline : moonOutline"></ion-icon>
  </ion-button>
</template>

<script setup lang="ts">
  import { IonIcon } from "@ionic/vue";
  import { sunnyOutline, moonOutline } from "ionicons/icons";
  import { onBeforeMount, onMounted, ref } from "vue";
  import Cookies from "js-cookie";

  const isDarkMode = ref(false);
  const MODE = {
    dark: "dark",
    light: "light",
  };

  const toggleTheme = (value: boolean | undefined) => {
    if (typeof value !== "boolean") value = !isDarkMode.value;
    isDarkMode.value = value;
    document.body.classList.toggle(MODE.dark, isDarkMode.value);
    Cookies.set("theme_mode", value ? MODE.dark : MODE.light, {
      expires: 3,
      domain: location.hostname,
      path: "/",
      secure: true,
      sameSite: "None",
    });
  };

  onBeforeMount(() => {
    checkMode();
  });

  function checkMode() {
    const mode = Cookies.get("theme_mode");

    if (mode) {
      toggleTheme(mode === MODE.dark);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      toggleTheme(true);
    }
  }
</script>

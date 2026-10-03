<template>
  <ion-item lines="none">
    <ion-toggle :checked="isDark" @ionChange="onToggle">
      {{ $t("pages.settings.theme") }}
    </ion-toggle>
  </ion-item>
</template>

<script setup lang="ts">
  import { ref } from "vue";
  import { currentTheme, setTheme } from "@/plugins/theme";

  // Тему на старте ставит applyInitialTheme() в main.ts — здесь только читаем.
  const isDark = ref(currentTheme() === "dark");

  function onToggle(event: CustomEvent) {
    const checked = (event.detail as { checked: boolean }).checked;
    isDark.value = checked;
    setTheme(checked ? "dark" : "light");
  }
</script>

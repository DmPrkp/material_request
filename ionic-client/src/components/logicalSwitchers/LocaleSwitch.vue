<template>
  <ion-item lines="none">
    <ion-select
      :label="$t('pages.settings.language')"
      :value="locale"
      interface="popover"
      @ionChange="onChange"
    >
      <ion-select-option
        v-for="code in SUPPORTED_LOCALES"
        :key="code"
        :value="code"
      >
        {{ $t(`ui.locales.${code}`) }}
      </ion-select-option>
    </ion-select>
  </ion-item>
</template>

<script setup lang="ts">
  import { IonSelect, IonSelectOption } from "@ionic/vue";
  import { computed } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { Locale } from "@/types";
  import {
    SUPPORTED_LOCALES,
    normalizeLocale,
    resolveInitialLocale,
  } from "@/plugins/i18n";

  const route = useRoute();
  const router = useRouter();

  const locale = computed<Locale>(
    () => normalizeLocale(route.params.locale) || resolveInitialLocale()
  );

  /**
   * Локаль — часть URL, поэтому меняем сегмент пути. Словарь догрузит и
   * применит гвард роутера, так что переход дождётся нужного языка.
   */
  function onChange(event: CustomEvent) {
    const value = normalizeLocale((event.detail as { value?: string }).value);
    if (!value || value === locale.value) return;

    const segments = route.fullPath.split("/");
    segments[1] = value;
    router.replace(segments.join("/") || `/${value}/main`);
  }
</script>

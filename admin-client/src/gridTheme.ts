import { colorSchemeDark, themeQuartz } from 'ag-grid-community';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

/** Тема AG Grid вслед за системной — как у PrimeVue (darkModeSelector: 'system'). */
export function useGridTheme() {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = ref(media.matches);
  const onChange = (e: MediaQueryListEvent) => (isDark.value = e.matches);
  onMounted(() => media.addEventListener('change', onChange));
  onBeforeUnmount(() => media.removeEventListener('change', onChange));

  return computed(() =>
    (isDark.value ? themeQuartz.withPart(colorSchemeDark) : themeQuartz).withParams({ fontSize: 13, spacing: 6 }),
  );
}

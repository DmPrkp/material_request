<template>
  <ion-page v-if="route.name === 'work-type'">
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>
          <h1>{{ $t(`pages.system.title`) }}</h1>
        </ion-title>
      </ion-item-divider>
      <MainMenuItems
        :items="items"
        @item="chooseItem"
      />
      <ion-note
        v-if="!loading && !items.length"
        class="ion-padding"
      >
        {{ $t("pages.system.empty") }}
      </ion-note>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { layersOutline } from "ionicons/icons";

  import MainMenuItems from "@/components/pagesParts/MainMenuItems.vue";
  import { loadWorkTypeSystems } from "@/components/pagesParts/calculator/systems";
  import { SYSTEM_IMAGES, groupedTitles, groupsOf } from "@/constants/systems";
  import { type MainMenuItem } from "../types/controller/main-menu";

  const route = useRoute();
  const router = useRouter();
  const { locale } = useI18n({ useScope: "global" });

  const items = ref<MainMenuItem[]>([]);
  const loading = ref(true);
  /** Коды групп — по ним же отличаем, куда вести с плитки. */
  const groupCodes = ref(new Set<string>());

  const workTypeCode = computed(() =>
    typeof route.params.workType === "string" ? route.params.workType : ""
  );

  /**
   * Плитка вида работ: сначала группы (constants/systems), потом технологии,
   * которые ни в одну не попали. Технологии — из словаря, на языке страницы,
   * поэтому при смене языка список перечитывается, а не переводится через i18n.
   * У групп наоборот: это разложение плитки, а не данные словаря, — подпись
   * берётся из i18n по коду (MainMenuItems делает это сам, когда нет label).
   */
  async function load() {
    const code = workTypeCode.value;
    if (!code) return;

    loading.value = true;
    try {
      const groups = groupsOf(code);
      groupCodes.value = new Set(groups.map((group) => group.code));

      const systems = await loadWorkTypeSystems(code, locale.value);
      if (!systems) return;

      const grouped = groupedTitles(code);
      items.value = [
        ...groups.map((group) => ({
          title: group.code,
          description: group.code,
          icon: layersOutline,
        })),
        ...systems
          .filter((system) => !grouped.has(system.title))
          .map((system) => ({
            title: system.title,
            label: system.name,
            description: system.description ?? "",
            img: SYSTEM_IMAGES[system.title],
            icon: layersOutline,
          })),
      ];
    } finally {
      loading.value = false;
    }
  }

  watch([workTypeCode, locale], () => void load(), { immediate: true });

  function chooseItem(item: MainMenuItem) {
    if (groupCodes.value.has(item.title)) {
      router.push({ name: "system-group", params: { group: item.title } });
      return;
    }

    router.push({ name: "system", params: { system: item.title } });
  }
</script>

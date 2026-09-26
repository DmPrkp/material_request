<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>
          <h1>{{ $t(`pages.main.types.${groupCode}`) }}</h1>
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
</template>

<script lang="ts" setup>
  /**
   * Технологии одной группы: «Внутренние работы → Перегородки → Гипсокартон».
   *
   * Группа живёт в constants/systems, а не в словаре, поэтому её состав — список
   * технических кодов технологий; порядок показа берётся оттуда же. Технология,
   * которой в словаре уже нет (сняли, переименовали), просто не попадёт в список.
   */
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { layersOutline } from "ionicons/icons";

  import MainMenuItems from "@/components/pagesParts/MainMenuItems.vue";
  import { loadWorkTypeSystems } from "@/components/pagesParts/calculator/systems";
  import { SYSTEM_IMAGES, groupsOf } from "@/constants/systems";
  import { type MainMenuItem } from "../types/controller/main-menu";

  const route = useRoute();
  const router = useRouter();
  const { locale } = useI18n({ useScope: "global" });

  const items = ref<MainMenuItem[]>([]);
  const loading = ref(true);

  const workTypeCode = computed(() =>
    typeof route.params.workType === "string" ? route.params.workType : ""
  );
  const groupCode = computed(() =>
    typeof route.params.group === "string" ? route.params.group : ""
  );

  async function load() {
    const code = workTypeCode.value;
    const group = groupsOf(code).find((item) => item.code === groupCode.value);
    // Неизвестная группа в адресе — обратно к плитке вида работ.
    if (!group) {
      router.replace({ name: "work-type", params: { workType: code } });
      return;
    }

    loading.value = true;
    try {
      const systems = await loadWorkTypeSystems(code, locale.value);
      if (!systems) return;

      const byTitle = new Map(systems.map((system) => [system.title, system]));
      items.value = group.systems.flatMap((title) => {
        const system = byTitle.get(title);
        if (!system) return [];
        return [
          {
            title: system.title,
            label: system.name,
            description: system.description ?? "",
            img: SYSTEM_IMAGES[system.title],
            icon: layersOutline,
          },
        ];
      });
    } finally {
      loading.value = false;
    }
  }

  watch([workTypeCode, groupCode, locale], () => void load(), {
    immediate: true,
  });

  function chooseItem(item: MainMenuItem) {
    // Технология остаётся на прежнем адресе: группа — это шаг навигации,
    // а не часть пути технологии, поэтому sitemap и старые ссылки не трогаем.
    router.push({
      name: "system",
      params: { workType: workTypeCode.value, system: item.title },
    });
  }
</script>

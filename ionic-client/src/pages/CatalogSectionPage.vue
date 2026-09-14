<template>
  <ion-page>
    <ion-content>
      <ion-refresher
        slot="fixed"
        @ionRefresh="handleRefresh"
      >
        <ion-refresher-content />
      </ion-refresher>

      <div class="ion-padding">
        <ion-item-divider>
          <ion-title>{{ $t(`pages.catalog.tabs.${tab}`) }}</ion-title>
        </ion-item-divider>
      </div>

      <ion-searchbar
        :value="search"
        :debounce="300"
        :placeholder="$t('pages.catalog.search')"
        @ionInput="onSearch"
      />

      <ion-note
        v-if="!loading && !items.length"
        class="ion-padding empty"
      >
        {{ $t("pages.catalog.empty") }}
      </ion-note>

      <ion-list v-else>
        <ion-accordion-group @ionChange="onAccordionChange">
          <CatalogItem
            v-for="item in items"
            :key="`${tab}-${item.id}`"
            :item="item"
            :expandable="isExpandable(item)"
            :variants="variantsById[item.id]"
          />
        </ion-accordion-group>
      </ion-list>

      <div
        v-if="loading"
        class="ion-text-center ion-padding"
      >
        <ion-spinner />
      </div>

      <ion-infinite-scroll
        :disabled="!hasMore || loading"
        @ionInfinite="loadMore"
      >
        <ion-infinite-scroll-content />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute } from "vue-router";
  import {
    IonAccordionGroup,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonNote,
    IonSearchbar,
    type InfiniteScrollCustomEvent,
    type RefresherCustomEvent,
  } from "@ionic/vue";
  import CatalogItem from "@/components/pagesParts/catalog/CatalogItem.vue";
  import DictionaryModel, { type CatalogQuery } from "@/models/DictionaryModel";
  import type {
    DictionaryHandTool,
    DictionaryMaterial,
    DictionaryPage,
    DictionaryPowerTool,
    DictionaryVariant,
  } from "@/types/dto";
  import { usePreloader } from "@/store/preloader";
  import {
    DEFAULT_CATALOG_TAB,
    normalizeCatalogTab,
    type CatalogTab,
  } from "@/constants";

  type CatalogEntry =
    | DictionaryMaterial
    | DictionaryHandTool
    | DictionaryPowerTool;

  const PAGE_SIZE = 30;

  const preloader = usePreloader();
  const route = useRoute();

  /** Раздел — сегмент адреса, а не локальное состояние страницы. */
  const tab = computed<CatalogTab>(
    () => normalizeCatalogTab(route.params.tab) ?? DEFAULT_CATALOG_TAB,
  );

  const search = ref("");
  const items = ref<CatalogEntry[]>([]);
  const page = ref(1);
  const pages = ref(1);
  const loading = ref(false);
  const variantsById = ref<Record<number, DictionaryVariant[]>>({});

  const hasMore = computed(() => page.value < pages.value);

  /**
   * Стрелку показываем только там, где есть что разворачивать: у электроинструмента
   * типоразмеров не бывает вовсе, а среди материалов их нет у части позиций.
   */
  function isExpandable(item: CatalogEntry): boolean {
    return "variantsCount" in item && item.variantsCount > 0;
  }

  function fetchPage(query: CatalogQuery) {
    switch (tab.value) {
      case "hand_tools":
        return DictionaryModel.handTools(query);
      case "power_tools":
        return DictionaryModel.powerTools(query);
      default:
        return DictionaryModel.materials(query);
    }
  }

  async function load(nextPage: number) {
    loading.value = true;
    preloader.setPreloader(true);

    try {
      const response = (await fetchPage({
        page: nextPage,
        limit: PAGE_SIZE,
        q: search.value,
      })) as DictionaryPage<CatalogEntry> | undefined;

      if (!response) {
        pages.value = nextPage;
        return;
      }

      items.value =
        nextPage === 1 ? response.items : [...items.value, ...response.items];
      page.value = response.page;
      pages.value = response.pages;
    } finally {
      loading.value = false;
      preloader.setPreloader(false);
    }
  }

  /** Сброс при смене раздела или поискового запроса. */
  async function reload() {
    items.value = [];
    variantsById.value = {};
    page.value = 1;
    pages.value = 1;
    await load(1);
  }

  function onSearch(event: CustomEvent) {
    const value = (event.target as HTMLIonSearchbarElement).value ?? "";
    if (value === search.value) return;
    search.value = value;
    void reload();
  }

  async function loadMore(event: InfiniteScrollCustomEvent) {
    if (hasMore.value) await load(page.value + 1);
    await event.target.complete();
  }

  async function handleRefresh(event: RefresherCustomEvent) {
    await reload();
    await event.target.complete();
  }

  /** Типоразмеры тянем лениво — только для раскрытой позиции. */
  async function onAccordionChange(event: CustomEvent) {
    const value = (event.detail as { value?: string | string[] }).value;
    const id = Number(Array.isArray(value) ? value[0] : value);

    if (!Number.isFinite(id) || variantsById.value[id]) return;

    const variants =
      tab.value === "hand_tools"
        ? await DictionaryModel.handToolVariants(id)
        : await DictionaryModel.materialVariants(id);

    variantsById.value = { ...variantsById.value, [id]: variants ?? [] };
  }

  // Имена приходят с сервера уже на языке интерфейса — сменили язык, перечитываем.
  const { locale } = useI18n({ useScope: "global" });

  /** Первая загрузка, переход между разделами и смена языка — один и тот же путь. */
  watch([tab, locale], () => void reload(), { immediate: true });
</script>

<style scoped>
  .empty {
    display: block;
    text-align: center;
  }
</style>

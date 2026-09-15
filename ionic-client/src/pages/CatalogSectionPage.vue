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

      <!-- Таб — сегмент адреса (/power_tools/corded), а не состояние страницы. -->
      <ion-segment
        v-if="isPowerTools"
        class="power_tabs ion-padding-horizontal"
        :value="powerCurrent"
        @ionChange="onPowerTab"
      >
        <ion-segment-button
          v-for="current in POWER_TOOL_CURRENTS"
          :key="current"
          :value="current"
        >
          <ion-label>{{ $t(`pages.catalog.power_tabs.${current}`) }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      <ion-searchbar
        :value="search"
        :debounce="300"
        :placeholder="$t('pages.catalog.search')"
        @ionInput="onSearch"
      />

      <div
        v-if="isMaterials || (canEdit && isHandTools)"
        class="catalog_tools ion-padding-horizontal"
      >
        <ion-select
          v-if="isMaterials"
          class="type_filter"
          :value="typeFilter"
          :label="$t('pages.catalog.type')"
          interface="popover"
          @ionChange="onTypeFilter"
        >
          <ion-select-option value="all">
            {{ $t("pages.catalog.all_types") }}
          </ion-select-option>
          <ion-select-option value="none">
            {{ $t("pages.catalog.untyped") }}
          </ion-select-option>
          <ion-select-option
            v-for="type in materialTypes"
            :key="type.id"
            :value="String(type.id)"
          >
            {{ type.name }}
          </ion-select-option>
        </ion-select>
        <CutCornerBtn
          v-if="canEdit && isMaterials"
          @click="openMaterialModal(null)"
        >
          {{ $t("pages.catalog.add_material") }}
        </CutCornerBtn>
        <CutCornerBtn
          v-if="canEdit && isHandTools"
          @click="openHandToolModal(null)"
        >
          {{ $t("pages.catalog.add_hand_tool") }}
        </CutCornerBtn>
      </div>

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
            :has-sizes="hasSizes(item) || variantsEditable"
            :variants="variantsById[item.id]"
            :editable="canEdit && (isMaterials || isHandTools)"
            :variants-editable="variantsEditable"
            @edit="onEdit(item)"
            @edit-variant="(variant) => openVariantModal(item, variant)"
            @add-variant="openVariantModal(item, null)"
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

      <MaterialModal
        :is-open="modalOpen"
        :material="editing"
        :units="units"
        :types="materialTypes"
        @close="closeMaterialModal"
      />
      <HandToolModal
        :is-open="handToolModalOpen"
        :tool="editingTool"
        @close="closeHandToolModal"
      />
      <VariantModal
        :is-open="variantModalOpen"
        :owner="variantOwner?.kind ?? 'hand-tools'"
        :owner-id="variantOwner?.id ?? null"
        :owner-name="variantOwner?.name ?? ''"
        :variant="editingVariant"
        :can-modify="variantOwner?.canModify ?? false"
        @close="closeVariantModal"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import {
    IonAccordionGroup,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonNote,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    type InfiniteScrollCustomEvent,
    type RefresherCustomEvent,
  } from "@ionic/vue";
  import CatalogItem from "@/components/pagesParts/catalog/CatalogItem.vue";
  import MaterialModal from "@/components/pagesParts/catalog/MaterialModal.vue";
  import HandToolModal from "@/components/pagesParts/catalog/HandToolModal.vue";
  import VariantModal from "@/components/pagesParts/catalog/VariantModal.vue";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import DictionaryModel, {
    type CatalogQuery,
    type VariantOwner,
  } from "@/models/DictionaryModel";
  import type {
    DictionaryHandTool,
    DictionaryMaterial,
    DictionaryMaterialType,
    DictionaryPage,
    DictionaryPowerTool,
    DictionaryUnit,
    DictionaryVariant,
  } from "@/types/dto";
  import { useOwnership } from "@/components/pagesParts/catalog/ownership";
  import { useAuthStore } from "@/store/auth";
  import { usePreloader } from "@/store/preloader";
  import {
    DEFAULT_CATALOG_TAB,
    DEFAULT_POWER_TOOL_CURRENT,
    POWER_TOOL_CURRENTS,
    normalizeCatalogTab,
    normalizePowerToolCurrent,
    type CatalogTab,
    type PowerToolCurrent,
  } from "@/constants";

  type CatalogEntry =
    | DictionaryMaterial
    | DictionaryHandTool
    | DictionaryPowerTool;

  const PAGE_SIZE = 30;

  const preloader = usePreloader();
  const route = useRoute();
  const router = useRouter();

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

  const authStore = useAuthStore();
  const { canModify } = useOwnership();
  // Кнопки видит только вошедший, но решает словарь: без токена запись не примет.
  const canEdit = computed(() => authStore.isAuthenticated);
  const isMaterials = computed(() => tab.value === "materials");
  // Электроинструмент пока пишется без входа и без формы — карандаша там нет.
  const isHandTools = computed(() => tab.value === "hand_tools");
  const isPowerTools = computed(() => tab.value === "power_tools");

  /** Питание — сегмент адреса, как и сам раздел; без него роутер уводит на corded. */
  const powerCurrent = computed<PowerToolCurrent>(
    () =>
      normalizePowerToolCurrent(route.params.current) ??
      DEFAULT_POWER_TOOL_CURRENT,
  );

  function onPowerTab(event: CustomEvent) {
    const value = normalizePowerToolCurrent(
      String((event.detail as { value?: unknown }).value ?? ""),
    );
    if (!value || value === powerCurrent.value) return;
    // replace: переключение табов не копит историю — «назад» ведёт из раздела.
    void router.replace({
      name: "catalog-power-tools",
      params: { ...route.params, current: value },
    });
  }
  /**
   * В расчёт идут сборки (7:227, 13:205:226), а не базовая позиция, — у вошедшего
   * каждая позиция ручного инструмента и материалов раскрывается, даже без
   * параметров: там её сборка с code = id и «добавить сборку».
   */
  const variantsEditable = computed(
    () => canEdit.value && (isHandTools.value || isMaterials.value),
  );

  /**
   * Фильтр по типу материала: 'all' — все, 'none' — без типа, иначе id типа
   * строкой — ion-select надёжнее сравнивает строки, чем числа вперемешку со строками.
   */
  const typeFilter = ref("all");
  /** Типы и единицы — для фильтра и формы; названия уже на языке страницы. */
  const materialTypes = ref<DictionaryMaterialType[]>([]);
  const units = ref<DictionaryUnit[]>([]);

  const modalOpen = ref(false);
  /** null — модалка на добавление. */
  const editing = ref<DictionaryMaterial | null>(null);

  function filterQuery(): Pick<CatalogQuery, "typeId" | "untyped" | "corded"> {
    if (isPowerTools.value) return { corded: powerCurrent.value === "corded" };
    if (!isMaterials.value || typeFilter.value === "all") return {};
    if (typeFilter.value === "none") return { untyped: true };
    return { typeId: Number(typeFilter.value) };
  }

  function onTypeFilter(event: CustomEvent) {
    const value = String((event.detail as { value?: unknown }).value ?? "all");
    if (value === typeFilter.value) return;
    typeFilter.value = value;
    void reload();
  }

  async function loadMaterialRefs() {
    const [typesPage, unitsPage] = await Promise.all([
      DictionaryModel.materialTypes(),
      DictionaryModel.units(),
    ]);
    // get() глотает сетевую ошибку — тогда оставляем, что было.
    if (typesPage) materialTypes.value = typesPage.items;
    if (unitsPage) units.value = unitsPage.items;
  }

  function openMaterialModal(material: DictionaryMaterial | null) {
    editing.value = material;
    modalOpen.value = true;
  }

  /** Перечитываем после закрытия: имя, тип или единица могли поменяться. */
  function closeMaterialModal() {
    // didDismiss приходит и после закрытия кнопкой — второй раз не грузим.
    if (!modalOpen.value) return;
    modalOpen.value = false;
    void reload();
  }

  const handToolModalOpen = ref(false);
  /** null — модалка на добавление. */
  const editingTool = ref<DictionaryHandTool | null>(null);

  function openHandToolModal(tool: DictionaryHandTool | null) {
    editingTool.value = tool;
    handToolModalOpen.value = true;
  }

  function closeHandToolModal() {
    // Как у материалов: didDismiss приходит и после закрытия кнопкой.
    if (!handToolModalOpen.value) return;
    handToolModalOpen.value = false;
    void reload();
  }

  const variantModalOpen = ref(false);
  /**
   * Чья сборка: id для запроса, название — в шапку формы; canModify — своя ли позиция
   * (чужая правится в копии, удалять её сборки нельзя).
   */
  const variantOwner = ref<{
    kind: VariantOwner;
    id: number;
    name: string;
    canModify: boolean;
  } | null>(null);
  /** null — новая сборка. */
  const editingVariant = ref<DictionaryVariant | null>(null);

  function openVariantModal(item: CatalogEntry, variant: DictionaryVariant | null) {
    variantOwner.value = {
      kind: isHandTools.value ? "hand-tools" : "materials",
      id: item.id,
      name: item.name,
      canModify: canModify(item),
    };
    editingVariant.value = variant;
    variantModalOpen.value = true;
  }

  /**
   * Перечитываем только сборки этой позиции: полная перезагрузка свернула бы список.
   * Кроме случая, когда сборка ушла в копию чужой позиции (у сохранённой другой
   * ownerId): тогда в списке появилась новая позиция — перечитываем весь.
   */
  async function closeVariantModal(saved?: { ownerId: number }) {
    if (!variantModalOpen.value) return;
    variantModalOpen.value = false;
    const owner = variantOwner.value;
    if (!owner) return;
    if (saved && saved.ownerId !== owner.id) {
      await reload();
      return;
    }
    const variants = await DictionaryModel.variants(owner.kind, owner.id);
    if (variants) variantsById.value = { ...variantsById.value, [owner.id]: variants };
  }

  /** Карандаш виден только в разделах с формой — тип позиции решает раздел. */
  function onEdit(item: CatalogEntry) {
    if (isMaterials.value) openMaterialModal(item as DictionaryMaterial);
    else if (isHandTools.value) openHandToolModal(item as DictionaryHandTool);
  }

  /** Настоящие типоразмеры — с параметрами; служебный вариант без них сервер не считает. */
  function hasSizes(item: CatalogEntry): boolean {
    return "variantsCount" in item && item.variantsCount > 0;
  }

  /**
   * Стрелку показываем только там, где есть что разворачивать: типоразмеры или
   * описание. У электроинструмента нет ни того ни другого, у части материалов —
   * только описание.
   */
  function isExpandable(item: CatalogEntry): boolean {
    return (
      variantsEditable.value ||
      hasSizes(item) ||
      ("description" in item && Boolean(item.description))
    );
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
        ...filterQuery(),
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

    // Раскрыли ради описания — типоразмеров нет, запрашивать нечего.
    const item = items.value.find((entry) => entry.id === id);
    if (!item || !(hasSizes(item) || variantsEditable.value)) return;

    const variants =
      tab.value === "hand_tools"
        ? await DictionaryModel.handToolVariants(id)
        : await DictionaryModel.materialVariants(id);

    variantsById.value = { ...variantsById.value, [id]: variants ?? [] };
  }

  // Имена приходят с сервера уже на языке интерфейса — сменили язык, перечитываем.
  const { locale } = useI18n({ useScope: "global" });

  /** Первая загрузка, переход между разделами и смена языка — один и тот же путь. */
  watch(
    [tab, powerCurrent, locale],
    () => {
      if (isMaterials.value) void loadMaterialRefs();
      void reload();
    },
    { immediate: true },
  );
</script>

<style scoped>
  .power_tabs {
    margin-bottom: 8px;
  }

  .catalog_tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  .type_filter {
    flex: 1;
    min-width: 200px;
  }

  .empty {
    display: block;
    text-align: center;
  }
</style>

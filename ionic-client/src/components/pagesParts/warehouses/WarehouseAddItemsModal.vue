<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ $t("pages.warehouses.add_items_title") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="cancel">
          {{ $t("ui.buttons.cancel") }}
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <!--
      Три раздела и их шапки — те же, что в заявке: материалы, ручной, электро.
      Вместо расхода на объём — количество, которое кладут на склад.
    -->
    <template v-for="section in SECTIONS" :key="section.kind">
      <MaterialHeader v-if="section.kind === 'material'" readonly />
      <HandToolListHeader v-else-if="section.kind === 'hand_tool'" readonly />
      <PowerToolListHeader v-else readonly />

      <ion-item v-for="(row, num) in rowsOf(section.kind)" :key="row.key">
        <ion-grid>
          <!-- Числа — по центру высоты строки: название бывает в две-три строки. -->
          <ion-row class="ion-align-items-center">
            <ion-col size="1" class="cell-center">
              {{ num + 1 }}
            </ion-col>
            <ion-col size="7" class="ion-text-start cell-name">
              {{ row.title }}
              <span v-if="row.details" class="param">
                {{ row.details }}
              </span>
            </ion-col>
            <ion-col size="2" class="cell-center">
              <ion-input
                v-model="row.quantity"
                class="quantity"
                type="text"
                inputmode="decimal"
                :class="{ invalid: parseQuantity(row.quantity) === null }"
                :aria-label="$t('pages.warehouses.action.quantity')"
              />
            </ion-col>
            <ion-col size="2" class="cell-center">
              {{ row.measure || $t("measure.pcs") }}
            </ion-col>
          </ion-row>
        </ion-grid>
        <ion-button
          slot="end"
          fill="clear"
          color="danger"
          size="small"
          :aria-label="$t('ui.buttons.remove')"
          @click="drop(row.key)"
        >
          <ion-icon slot="icon-only" :icon="trashOutline" />
        </ion-button>
      </ion-item>

      <!-- Подбор по словарю разворачивается в своём разделе — как у норм этапа. -->
      <div v-if="picker.kind === section.kind" class="picker">
        <template v-if="!picker.owner">
          <ion-searchbar
            v-model="picker.q"
            :debounce="300"
            :placeholder="$t('pages.catalog.search')"
            @ionInput="search"
          />
          <ion-spinner v-if="picker.loading" name="dots" />
          <ion-list v-else>
            <ion-item
              v-for="item in picker.results"
              :key="item.id"
              button
              :disabled="
                section.kind === 'power_tool' &&
                has(section.kind, String(item.id))
              "
              @click="pickOwner(item)"
            >
              <ion-label class="ion-text-wrap">
                <h3>{{ item.name }}</h3>
                <p v-if="ownerDetails(item)">{{ ownerDetails(item) }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="!picker.results.length" lines="none">
              <ion-note>{{ $t("pages.catalog.empty") }}</ion-note>
            </ion-item>
          </ion-list>
        </template>

        <ion-list v-else>
          <ion-list-header>
            {{
              $t("pages.catalog.norms.choose_variant", {
                name: picker.owner.name,
              })
            }}
          </ion-list-header>
          <ion-spinner v-if="picker.loading" name="dots" />
          <ion-item
            v-for="variant in picker.variants"
            v-else
            :key="variant.id"
            button
            :disabled="has(section.kind, variant.code)"
            @click="pickVariant(variant)"
          >
            <ion-label class="ion-text-wrap">
              {{
                variantDetails(variant) || $t("pages.catalog.single_variant")
              }}
            </ion-label>
            <ion-note slot="end">{{ variant.code }}</ion-note>
          </ion-item>
        </ion-list>

        <ion-button fill="clear" size="small" @click="closePicker">
          {{ $t("pages.catalog.norms.cancel") }}
        </ion-button>
      </div>

      <ion-grid v-else>
        <ion-row class="ion-justify-content-end">
          <ion-col size="auto">
            <CutCornerBtn @click="openPicker(section.kind)">
              {{ $t("ui.buttons.add") }}
            </CutCornerBtn>
          </ion-col>
        </ion-row>
      </ion-grid>
    </template>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <ion-button expand="block" :disabled="!ready" @click="confirm">
        {{ $t("pages.warehouses.action.done") }}
      </ion-button>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts" setup>
  /**
   * Подбор позиций словаря для склада. Разделы, шапки и столбцы — из заявки
   * (MaterialHeader, HandToolListHeader, PowerToolListHeader), сам подбор —
   * как у норм этапа (CatalogStagePage): поиск позиции, потом её сборка.
   * Наружу отдаёт готовые позиции — кладёт их на склад страница склада.
   */
  import {
    IonButtons,
    IonFooter,
    IonIcon,
    IonListHeader,
    IonNote,
    IonSearchbar,
    IonSpinner,
    modalController,
  } from "@ionic/vue";
  import { trashOutline } from "ionicons/icons";
  import { computed, reactive, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import HandToolListHeader from "@/components/pagesParts/handTools/HandToolListHeader.vue";
  import MaterialHeader from "@/components/pagesParts/materials/MaterialHeader.vue";
  import PowerToolListHeader from "@/components/pagesParts/powerTools/PowerToolListHeader.vue";
  import { useParamLabel } from "@/components/pagesParts/catalog/paramLabel";
  import { useUnitLabel } from "@/components/pagesParts/catalog/unitLabel";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import DictionaryModel from "@/models/DictionaryModel";
  import type {
    DictionaryHandTool,
    DictionaryMaterial,
    DictionaryPowerTool,
    DictionaryVariant,
    WarehouseItemInput,
    WarehouseItemKind,
  } from "@/types/dto";
  import { ITEM_KINDS } from "./itemLabels";

  type PickerItem =
    DictionaryMaterial | DictionaryHandTool | DictionaryPowerTool;

  /** Выбранное до отправки: количество — строкой, его ещё правят. */
  type ChosenRow = {
    key: string;
    kind: WarehouseItemKind;
    ref: string;
    title: string;
    details: string;
    measure: string;
    quantity: string;
  };

  /** Результатов поиска — на экран, дальше уточняют запросом (как в нормах этапа). */
  const PICKER_LIMIT = 20;

  const SECTIONS = ITEM_KINDS.map((kind) => ({ kind }));

  const { t } = useI18n({ useScope: "global" });
  const { paramLabel } = useParamLabel();
  const unitLabel = useUnitLabel();

  const chosen = ref<ChosenRow[]>([]);

  const picker = reactive<{
    /** Раздел, в котором открыт подбор; null — закрыт. */
    kind: WarehouseItemKind | null;
    q: string;
    loading: boolean;
    results: PickerItem[];
    /** Позиция, у которой выбирают сборку; null — ещё ищут позицию. */
    owner: DictionaryMaterial | DictionaryHandTool | null;
    variants: DictionaryVariant[];
  }>({
    kind: null,
    q: "",
    loading: false,
    results: [],
    owner: null,
    variants: [],
  });

  const ready = computed(
    () =>
      chosen.value.length > 0 &&
      chosen.value.every((row) => parseQuantity(row.quantity) !== null),
  );

  function rowsOf(kind: WarehouseItemKind): ChosenRow[] {
    return chosen.value.filter((row) => row.kind === kind);
  }

  function openPicker(kind: WarehouseItemKind) {
    picker.kind = kind;
    picker.q = "";
    picker.owner = null;
    picker.variants = [];
    void search();
  }

  function closePicker() {
    picker.kind = null;
    picker.owner = null;
    picker.results = [];
    picker.variants = [];
  }

  async function search() {
    const kind = picker.kind;
    if (!kind) return;
    const query = { q: picker.q, limit: PICKER_LIMIT };

    picker.loading = true;
    try {
      const page =
        kind === "material"
          ? await DictionaryModel.materials(query)
          : kind === "hand_tool"
            ? await DictionaryModel.handTools(query)
            : await DictionaryModel.powerTools(query);
      // Пока искали, подбор закрыли или дописали запрос — этот ответ уже не нужен.
      if (picker.kind !== kind || picker.q !== query.q) return;
      picker.results = page?.items ?? [];
    } finally {
      picker.loading = false;
    }
  }

  async function pickOwner(item: PickerItem) {
    const kind = picker.kind;
    if (!kind) return;

    if (kind === "power_tool") {
      const tool = item as DictionaryPowerTool;
      add(kind, String(tool.id), tool.name, poweredBy(tool), "");
      closePicker();
      return;
    }

    const owner = item as DictionaryMaterial | DictionaryHandTool;
    picker.owner = owner;
    picker.variants = [];
    picker.loading = true;
    try {
      const found = await DictionaryModel.variants(
        kind === "material" ? "materials" : "hand-tools",
        owner.id,
      );
      if (picker.owner !== owner) return;
      // Удалённые из сборника сборки не предлагаем: класть на склад их незачем.
      picker.variants = (found ?? []).filter((variant) => variant.isActive);
    } finally {
      picker.loading = false;
    }

    // Сборка одна — выбирать нечего.
    if (picker.variants.length === 1) pickVariant(picker.variants[0]);
  }

  function pickVariant(variant: DictionaryVariant) {
    const kind = picker.kind;
    const owner = picker.owner;
    if (!kind || !owner) return;
    add(
      kind,
      variant.code,
      owner.name,
      variantDetails(variant),
      "unit" in owner && owner.unit ? unitLabel(owner.unit) : "",
    );
    closePicker();
  }

  /** Уже выбранную позицию второй строкой не заводим — её количество правят в строке. */
  function add(
    kind: WarehouseItemKind,
    ref: string,
    title: string,
    details: string,
    measure: string,
  ) {
    if (has(kind, ref)) return;
    chosen.value = [
      ...chosen.value,
      {
        key: `${kind}:${ref}`,
        kind,
        ref,
        title,
        details,
        measure,
        quantity: "1",
      },
    ];
  }

  function has(kind: WarehouseItemKind, ref: string): boolean {
    return chosen.value.some((row) => row.kind === kind && row.ref === ref);
  }

  function drop(key: string) {
    chosen.value = chosen.value.filter((row) => row.key !== key);
  }

  function variantDetails(variant: DictionaryVariant): string {
    return variant.params.map(paramLabel).join(" ");
  }

  function poweredBy(tool: DictionaryPowerTool): string {
    return t(
      `pages.catalog.power_tabs.${tool.isCorded ? "corded" : "cordless"}`,
    );
  }

  function ownerDetails(item: PickerItem): string {
    if ("isCorded" in item) return poweredBy(item);
    if ("unit" in item) return unitLabel(item.unit);
    return "";
  }

  /** '1,05' с мобильной клавиатуры — тоже число; ноль на склад не кладут. */
  function parseQuantity(raw: string): number | null {
    const text = raw.trim().replace(",", ".");
    const value = Number(text);
    return text && Number.isFinite(value) && value > 0 ? value : null;
  }

  function confirm() {
    const items: WarehouseItemInput[] = [];
    for (const row of chosen.value) {
      const quantity = parseQuantity(row.quantity);
      if (quantity === null) return;
      items.push({ kind: row.kind, ref: row.ref, quantity });
    }
    modalController.dismiss(items, "confirm");
  }

  function cancel() {
    modalController.dismiss(null, "cancel");
  }
</script>

<style scoped>
  /* Параметры сборки — своей строкой под названием, как в заявке. */
  .param {
    display: block;
  }

  .quantity {
    text-align: center;
  }

  .quantity.invalid {
    --color: var(--ion-color-danger);
  }

  .picker {
    padding: 0 8px 8px;
  }
</style>

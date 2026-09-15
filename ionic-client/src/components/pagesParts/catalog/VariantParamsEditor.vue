<template>
  <div>
    <ion-note
      v-if="!rows.length"
      class="hint"
    >
      {{ $t("pages.catalog.params.none") }}
    </ion-note>

    <div
      v-for="(row, index) in rows"
      :key="row.key"
      class="param"
    >
      <div class="param_fields">
        <ion-select
          v-model="row.kindId"
          class="param_kind"
          :label="$t('pages.catalog.params.kind')"
          label-placement="stacked"
          fill="outline"
          interface="popover"
        >
          <ion-select-option
            v-for="kind in kinds"
            :key="kind.id"
            :value="kind.id"
          >
            {{ kind.name }}
          </ion-select-option>
          <ion-select-option :value="NO_KIND">
            {{ $t("pages.catalog.params.no_kind") }}
          </ion-select-option>
        </ion-select>
        <ion-select
          v-model="row.unitId"
          class="param_unit"
          :label="$t('pages.catalog.params.unit')"
          label-placement="stacked"
          fill="outline"
          interface="popover"
        >
          <ion-select-option
            v-for="unit in units"
            :key="unit.id"
            :value="unit.id"
          >
            {{ unit.name }}
          </ion-select-option>
        </ion-select>
        <ion-input
          v-model="row.value"
          class="param_value"
          type="number"
          inputmode="decimal"
          min="0"
          :label="$t('pages.catalog.params.value')"
          label-placement="stacked"
          fill="outline"
        />
        <ion-button
          fill="clear"
          color="medium"
          :aria-label="$t('pages.catalog.params.remove')"
          @click="rows.splice(index, 1)"
        >
          <ion-icon
            slot="icon-only"
            :icon="closeOutline"
          />
        </ion-button>
      </div>

      <!-- Уже заведённые значения этого вида и единицы — выбрать в одно касание. -->
      <div
        v-if="suggestions(row).length"
        class="chips"
      >
        <ion-chip
          v-for="value in suggestions(row)"
          :key="value"
          :outline="normalize(row.value) !== value"
          @click="row.value = value"
        >
          {{ value }}
        </ion-chip>
      </div>
    </div>

    <ion-button
      fill="clear"
      size="small"
      @click="addRow"
    >
      <ion-icon
        slot="start"
        :icon="addOutline"
      />
      {{ $t("pages.catalog.params.add") }}
    </ion-button>
  </div>
</template>

<script setup lang="ts">
  /**
   * Параметры одной сборки: строки «вид, единица, значение», сколько угодно.
   *
   * Строки — v-model родителя; виды, единицы и подсказки редактор грузит сам при
   * каждом монтировании (ion-modal монтирует содержимое на открытии), поэтому они
   * всегда на языке страницы. validate() — наружу: кнопка сохранения у модалки.
   */
  import { onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { IonChip, IonIcon, IonNote, IonSelect, IonSelectOption } from "@ionic/vue";
  import { addOutline, closeOutline } from "ionicons/icons";
  import DictionaryModel from "@/models/DictionaryModel";
  import type {
    DictionaryParamKind,
    DictionaryParamValue,
    DictionaryUnit,
  } from "@/types/dto";
  import { NO_KIND, newRow, normalize, type ParamRow } from "./variantParams";

  /** Подсказок под полем значения — не больше этого, иначе они заслоняют форму. */
  const MAX_SUGGESTIONS = 12;

  const rows = defineModel<ParamRow[]>({ required: true });

  const { t } = useI18n({ useScope: "global" });

  const kinds = ref<DictionaryParamKind[]>([]);
  const units = ref<DictionaryUnit[]>([]);
  /** Заведённые значения по единице — для подсказок; грузятся по мере выбора единиц. */
  const valuesByUnit = ref<Record<number, DictionaryParamValue[]>>({});
  const pendingUnits = new Set<number>();

  onMounted(async () => {
    const [kindsPage, unitsPage] = await Promise.all([
      DictionaryModel.paramKinds(),
      DictionaryModel.units(),
    ]);
    // get() глотает сетевую ошибку — тогда селекты пустые, сохранить не дадут.
    if (kindsPage) kinds.value = kindsPage.items;
    if (unitsPage) units.value = unitsPage.items;
  });

  function addRow() {
    // Единицу подставляем с предыдущей строки: в одной сборке она обычно одна (мм).
    const last = rows.value[rows.value.length - 1];
    rows.value.push(newRow(last?.unitId ?? null));
  }

  function suggestions(row: ParamRow): string[] {
    if (row.unitId === null) return [];
    const values = (valuesByUnit.value[row.unitId] ?? [])
      .filter((value) => (value.kind?.id ?? NO_KIND) === row.kindId)
      .map((value) => normalize(value.value));
    return [...new Set(values)].slice(0, MAX_SUGGESTIONS);
  }

  async function ensureValues(unitId: number) {
    if (valuesByUnit.value[unitId] || pendingUnits.has(unitId)) return;
    pendingUnits.add(unitId);
    try {
      const page = await DictionaryModel.paramValues(unitId);
      // Без подсказок ввод работает и так.
      if (page) {
        valuesByUnit.value = { ...valuesByUnit.value, [unitId]: page.items };
      }
    } finally {
      pendingUnits.delete(unitId);
    }
  }

  // Подсказки нужны под каждой выбранной единицей — и сразу, и при смене в селекте.
  watch(
    () => rows.value.map((row) => row.unitId),
    (unitIds) => {
      for (const unitId of new Set(unitIds)) {
        if (unitId !== null) void ensureValues(unitId);
      }
    },
    { immediate: true },
  );

  /** Текст ошибки, если строки не готовы к отправке, иначе пусто. */
  function validate(): string {
    const incomplete = rows.value.some(
      (row) => row.unitId === null || !(Number(normalize(row.value)) > 0),
    );
    if (incomplete) return t("pages.catalog.params.incomplete");

    // «Ширина 60 и ширина 80» в одной сборке — почти наверняка опечатка.
    const seen = new Set<number>();
    for (const row of rows.value) {
      if (row.kindId === NO_KIND) continue;
      if (seen.has(row.kindId)) {
        const kind = kinds.value.find((item) => item.id === row.kindId);
        return t("pages.catalog.params.duplicate", { kind: kind?.name ?? "" });
      }
      seen.add(row.kindId);
    }
    return "";
  }

  defineExpose({ validate });
</script>

<style scoped>
  .hint {
    display: block;
    margin: 4px 0;
  }

  .param {
    margin-top: 12px;
  }

  .param_fields {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  /* На телефоне три поля в ряд не читаются: вид — отдельной строкой. */
  @media (max-width: 480px) {
    .param_fields {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    }

    .param_kind {
      grid-column: 1 / -1;
    }
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  .chips ion-chip {
    margin: 0;
    height: 26px;
    font-size: 13px;
  }
</style>

<template>
  <ion-page v-if="route.name === 'catalog-stage'">
    <ion-content>
      <div class="ion-padding">
        <ion-item-divider>
          <ion-title>
            <h1>{{ stageName || $t("pages.catalog.norms.title") }}</h1>
          </ion-title>
        </ion-item-divider>
      </div>

      <div class="ion-padding-horizontal ion-padding-bottom">
        <div
          v-if="loading"
          class="ion-text-center ion-padding"
        >
          <ion-spinner />
        </div>

        <ion-note
          v-else-if="notFound"
          class="hint"
        >
          {{ $t("pages.catalog.norms.not_found") }}
        </ion-note>

        <template v-else>
          <!-- Чужая общая технология: сохранение заведёт копию технологии, нормы — в неё. -->
          <ion-note
            v-if="editable && !owns"
            class="hint"
          >
            {{ $t("pages.catalog.norms.copy_hint") }}
          </ion-note>

          <!-- Одна группа без multiple: раскрыли раздел — предыдущий свернулся. -->
          <ion-accordion-group
            :value="openKind"
            @ionChange="onAccordion"
          >
            <ion-accordion
              v-for="section in SECTIONS"
              :key="section.kind"
              :value="section.kind"
            >
              <ion-item slot="header">
                <ion-label>{{ $t(section.title) }}</ion-label>
                <ion-note slot="end">{{ rows[section.kind].length }}</ion-note>
              </ion-item>

              <div slot="content">
                <!-- Что значит норма — своё у каждого раздела: у материалов на объём, у инструмента на звено. -->
                <ion-note class="hint section_hint">
                  {{ $t(section.hint, { unit: volumeUnit }) }}
                </ion-note>
                <ion-list>
                  <ion-item
                    v-if="!rows[section.kind].length"
                    lines="none"
                  >
                    <ion-note>{{ $t("pages.catalog.norms.empty") }}</ion-note>
                  </ion-item>

                  <template
                    v-for="row in rows[section.kind]"
                    :key="row.key"
                  >
                    <!--
                      Название с параметрами — отдельной строкой во всю ширину: так позиции
                      отделяются друг от друга. Параметры — тем же <p>, что и везде, только в
                      строку: серый у него свой в каждом режиме Ionic, свой цвет не подбираем.
                    -->
                    <ion-item
                      lines="none"
                      class="norm_name"
                    >
                      <ion-label class="ion-text-wrap">
                        <h3>{{ row.name }}</h3>
                        <p v-if="row.details">{{ row.details }}</p>
                      </ion-label>
                    </ion-item>

                    <ion-item
                      class="norm_values"
                      :lines="row.open ? 'none' : 'full'"
                    >
                      <ion-input
                        v-if="editable"
                        v-model="row.rate"
                        slot="end"
                        class="rate_input"
                        type="number"
                        inputmode="decimal"
                        min="0"
                        :aria-label="$t('pages.catalog.norms.rate')"
                      />
                      <span
                        v-else
                        slot="end"
                        class="rate_value"
                      >
                        {{ row.rate }}
                      </span>
                      <span
                        slot="end"
                        class="rate_unit"
                      >
                        {{ rateUnit(section.kind, row) }}
                      </span>
                      <!-- Примечание — на развороте; заполненное видно по закрашенной иконке. -->
                      <ion-button
                        v-if="editable || displayNote(row)"
                        slot="end"
                        fill="clear"
                        :aria-label="$t('pages.catalog.norms.note')"
                        size="small"
                        :aria-expanded="row.open"
                        @click="row.open = !row.open"
                      >
                        <ion-icon
                          slot="icon-only"
                          :icon="
                            displayNote(row) ? chatbubble : chatbubbleOutline
                          "
                        />
                      </ion-button>
                      <ion-button
                        v-if="editable"
                        slot="end"
                        fill="clear"
                        color="danger"
                        size="small"
                        :aria-label="$t('pages.catalog.norms.remove')"
                        @click="removeRow(section.kind, row)"
                      >
                        <ion-icon
                          slot="icon-only"
                          :icon="trashOutline"
                        />
                      </ion-button>
                    </ion-item>

                    <ion-item v-if="row.open">
                      <!-- textarea, а не input: примечание в строку не влезает и обрезалось. -->
                      <ion-textarea
                        v-if="editable"
                        v-model="row.note"
                        class="note_input"
                        :aria-label="$t('pages.catalog.norms.note')"
                        :placeholder="
                          row.otherNote || $t('pages.catalog.norms.note')
                        "
                        :maxlength="500"
                        :rows="1"
                        :auto-grow="true"
                      />
                      <ion-label
                        v-else
                        class="ion-text-wrap note_text"
                      >
                        {{ displayNote(row) }}
                      </ion-label>
                    </ion-item>
                  </template>
                </ion-list>

                <div
                  v-if="picker.kind === section.kind"
                  class="picker"
                >
                  <template v-if="picker.owner === null">
                    <ion-searchbar
                      v-model="picker.q"
                      :debounce="300"
                      :placeholder="$t('pages.catalog.search')"
                      @ionInput="search"
                    />
                    <ion-spinner
                      v-if="picker.loading"
                      name="dots"
                    />
                    <ion-list v-else>
                      <ion-item
                        v-for="item in picker.results"
                        :key="item.id"
                        button
                        :disabled="
                          section.kind === 'powerTools' &&
                          has(section.kind, item.id)
                        "
                        @click="pickOwner(item)"
                      >
                        <ion-label class="ion-text-wrap">
                          <h3>{{ item.name }}</h3>
                          <p v-if="ownerDetails(item)">
                            {{ ownerDetails(item) }}
                          </p>
                        </ion-label>
                      </ion-item>
                      <ion-item
                        v-if="!picker.results.length"
                        lines="none"
                      >
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
                    <ion-spinner
                      v-if="picker.loading"
                      name="dots"
                    />
                    <ion-item
                      v-for="variant in picker.variants"
                      :key="variant.id"
                      button
                      :disabled="has(section.kind, variant.id)"
                      @click="pickVariant(variant)"
                    >
                      <ion-label class="ion-text-wrap">
                        {{
                          variantDetails(variant) ||
                          $t("pages.catalog.single_variant")
                        }}
                      </ion-label>
                      <ion-note slot="end">{{ variant.code }}</ion-note>
                    </ion-item>
                  </ion-list>

                  <ion-button
                    fill="clear"
                    size="small"
                    @click="closePicker"
                  >
                    {{ $t("pages.catalog.norms.cancel") }}
                  </ion-button>
                </div>

                <ion-button
                  v-else-if="editable"
                  class="add_btn"
                  fill="clear"
                  @click="openPicker(section.kind)"
                >
                  <ion-icon
                    slot="start"
                    :icon="addOutline"
                  />
                  <span class="slanted">{{ $t(section.add) }}</span>
                </ion-button>
              </div>
            </ion-accordion>
          </ion-accordion-group>

          <ion-text
            v-if="error"
            color="danger"
          >
            <p>{{ error }}</p>
          </ion-text>
          <CutCornerBtn
            v-if="editable"
            class="save_btn"
            full-width
            :disabled="saving"
            @click="save"
          >
            {{ $t("ui.buttons.save") }}
          </CutCornerBtn>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  /**
   * Нормы расхода одного этапа (/catalog/systems/:workType/:systemId/stages/:stageId):
   * какие материалы и инструмент нужны и сколько.
   *
   * Нормы живут в calc-server, а названия — в словаре: calc-server знает только id
   * сборки (у электроинструмента — позиции), поэтому после норм отдельно спрашиваем
   * у словаря, что это за сборки. Словарь отдаёт названия уже на языке страницы;
   * примечания же calc-server хранит по полю на язык — форма, как и остальные формы
   * справочника, пишет только язык страницы, а другой возвращает как было.
   *
   * Сохраняется всё разом (PUT заменяет набор этапа целиком). Нормы чужой общей
   * технологии calc-server править не даст: сохранение сперва заводит копию
   * технологии, переносит в неё нормы всех этапов и пишет в этап копии.
   */
  import { computed, reactive, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import {
    IonIcon,
    IonAccordion,
    IonAccordionGroup,
    IonListHeader,
    IonNote,
    IonSearchbar,
    IonTextarea,
  } from "@ionic/vue";
  import {
    addOutline,
    chatbubble,
    chatbubbleOutline,
    trashOutline,
  } from "ionicons/icons";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import { HttpError } from "@/models/BaseModel";
  import DictionaryModel, { type VariantOwner } from "@/models/DictionaryModel";
  import NormsModel from "@/models/calc/NormsModel";
  import type {
    DictionaryHandTool,
    DictionaryMaterial,
    DictionaryPowerTool,
    DictionaryUnit,
    DictionaryVariant,
    NormKind,
    StageNorm,
    StageNormsInput,
  } from "@/types/dto";
  import {
    saveErrorText,
    suffixFor,
    type LocaleSuffix,
  } from "@/components/pagesParts/catalog/localeFields";
  import { useOwnership } from "@/components/pagesParts/catalog/ownership";
  import { useParamLabel } from "@/components/pagesParts/catalog/paramLabel";
  import {
    copyStageNorms,
    mapCopyStages,
  } from "@/components/pagesParts/catalog/technologyCopy";
  import { useUnitLabel } from "@/components/pagesParts/catalog/unitLabel";
  import { useAuthStore } from "@/store/auth";

  type Row = {
    key: string;
    /** Ссылка в словарь: код сборки, а у электроинструмента — id позиции. */
    ref: string | number;
    name: string;
    /** Параметры сборки или питание электроинструмента. */
    details: string;
    /** Единица материала; у инструмента — нет. */
    unit: DictionaryUnit | null;
    /** Строкой, как в поле ввода. */
    rate: string;
    /** Примечание на языке страницы — его и правят. */
    note: string;
    /** Примечания как пришли: язык, которого форма не касается, уходит обратно как был. */
    notes: Pick<StageNorm, "noteRu" | "noteEn">;
    /** Ближайшее заполненное на другом языке — подсказка в пустом поле. */
    otherNote: string;
    /** Примечание развёрнуто. */
    open: boolean;
  };

  type PickerItem =
    | DictionaryMaterial
    | DictionaryHandTool
    | DictionaryPowerTool;

  const SECTIONS: {
    kind: NormKind;
    title: string;
    add: string;
    /** Пояснение нормы в раскрытом разделе. */
    hint: string;
  }[] = [
    {
      kind: "materials",
      title: "pages.catalog.tabs.materials",
      add: "pages.catalog.add_material",
      hint: "pages.catalog.norms.hint_materials",
    },
    {
      kind: "handTools",
      title: "pages.catalog.tabs.hand_tools",
      add: "pages.catalog.add_hand_tool",
      hint: "pages.catalog.norms.hint_tools",
    },
    {
      kind: "powerTools",
      title: "pages.catalog.tabs.power_tools",
      add: "pages.catalog.norms.add_power_tool",
      hint: "pages.catalog.norms.hint_tools",
    },
  ];

  /** Результатов поиска в подборе — на экран, дальше уточняют запросом. */
  const PICKER_LIMIT = 20;
  /** Электроинструмента десятки: для названий берём весь разом. */
  const POWER_TOOLS_LIMIT = 200;

  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const { canModify } = useOwnership();

  const { t, locale } = useI18n({ useScope: "global" });
  const unitLabel = useUnitLabel();
  const { paramLabel } = useParamLabel();

  const emptyRows = (): Record<NormKind, Row[]> => ({
    materials: [],
    handTools: [],
    powerTools: [],
  });

  const rows = ref<Record<NormKind, Row[]>>(emptyRows());
  const loading = ref(false);
  const saving = ref(false);
  const error = ref("");
  const suffix = ref<LocaleSuffix>("Ru");
  const volumeUnit = ref("");
  const stageName = ref("");
  const notFound = ref(false);
  /** Технология своя (или админ): пишем без копии. */
  const owns = ref(false);
  /**
   * Копия чужой технологии, заведённая этим сохранением. Помним её: упал перенос
   * норм или сама запись — повторное «Сохранить» доделает, а не заведёт вторую копию.
   */
  let fork: {
    copyId: number;
    /** Этап оригинала -> этап копии. */
    stageIds: Map<number, number>;
    /** Чьи нормы ещё не перенесены; copyStageNorms вычёркивает по одной. */
    pendingNorms: Map<number, number>;
  } | null = null;
  let rowSeq = 0;

  // Не зависит от AUTH_ENABLED: запись без токена calc-server всё равно не примет.
  const editable = computed(() => authStore.isAuthenticated);

  const numberParam = (value: unknown) => {
    const parsed = typeof value === "string" ? Number(value) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const systemId = computed(() => numberParam(route.params.systemId));
  const stageId = computed(() => numberParam(route.params.stageId));

  /** Раскрытый раздел; undefined — все свёрнуты. Сначала открыты материалы. */
  const openKind = ref<NormKind | undefined>("materials");

  function onAccordion(event: CustomEvent<{ value?: unknown }>) {
    // ionChange всплывает и от вложенных полей ввода — слушаем только саму группу.
    if (event.target !== event.currentTarget) return;
    const value = event.detail.value;
    openKind.value = SECTIONS.find((section) => section.kind === value)?.kind;
    // Подбор открыт в свёрнутом разделе — закрываем, иначе добавил бы не туда.
    if (picker.kind !== openKind.value) closePicker();
  }

  const picker = reactive<{
    kind: NormKind | null;
    q: string;
    loading: boolean;
    results: PickerItem[];
    /** Выбранная позиция, у которой выбирают сборку; null — ещё ищут позицию. */
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

  function variantDetails(variant: DictionaryVariant): string {
    return variant.params.map(paramLabel).join(" × ");
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

  /**
   * Только единица позиции: «на 1 м² работ» и «на звено» уже сказаны в пояснении
   * раздела, повторять знаменатель в каждой строке незачем.
   */
  function rateUnit(kind: NormKind, row: Row): string {
    if (kind !== "materials") return t("measure.pcs");
    return row.unit ? unitLabel(row.unit) : "";
  }

  function displayNote(row: Row): string {
    return row.note || row.otherNote;
  }

  function has(kind: NormKind, ref: string | number): boolean {
    return rows.value[kind].some((row) => row.ref === ref);
  }

  function newRow(
    ref: string | number,
    name: string,
    details: string,
    unit: DictionaryUnit | null,
    norm?: StageNorm,
  ): Row {
    const notes = {
      noteRu: norm?.noteRu ?? null,
      noteEn: norm?.noteEn ?? null,
    };
    const own = suffix.value === "Ru" ? notes.noteRu : notes.noteEn;
    const other = suffix.value === "Ru" ? notes.noteEn : notes.noteRu;
    return {
      key: `row-${++rowSeq}`,
      ref,
      name,
      details,
      unit,
      rate: norm ? String(norm.rate) : "",
      note: own ?? "",
      notes,
      otherNote: other ?? "",
      open: false,
    };
  }

  async function load() {
    const system = systemId.value;
    const stage = stageId.value;
    if (system === null || stage === null) return;
    const isCurrent = () =>
      systemId.value === system && stageId.value === stage;

    error.value = "";
    notFound.value = false;
    fork = null;
    suffix.value = suffixFor(locale.value);
    rows.value = emptyRows();
    closePicker();
    loading.value = true;
    try {
      const [technology, stages, units, norms] = await Promise.all([
        DictionaryModel.system(system),
        DictionaryModel.systemStages(system),
        DictionaryModel.units(),
        NormsModel.byStage(stage),
      ]);
      // Пока грузили, ушли на другой этап.
      if (!isCurrent()) return;

      // Чужая личная технология словарём не отдаётся — как несуществующая.
      const found = stages?.find((item) => item.id === stage);
      if (!technology || !found) {
        notFound.value = true;
        return;
      }
      // get() глотает сетевую ошибку.
      if (!norms) {
        error.value = t("pages.catalog.norms.errors.load");
        return;
      }

      stageName.value = found.name;
      owns.value = canModify(technology);
      const unit = units?.items.find((item) => item.id === technology.unitId);
      volumeUnit.value = unit ? unitLabel(unit) : "";

      const codes = (kind: NormKind) =>
        norms[kind].map((norm) => String(norm.ref));
      const lookup = (owner: VariantOwner, kind: NormKind) =>
        codes(kind).length
          ? DictionaryModel.variantsByCodes(owner, codes(kind))
          : Promise.resolve([]);
      const [materials, handTools, powerTools] = await Promise.all([
        lookup("materials", "materials"),
        lookup("hand-tools", "handTools"),
        norms.powerTools.length
          ? DictionaryModel.powerTools({ limit: POWER_TOOLS_LIMIT }).then(
              (page) => page?.items,
            )
          : Promise.resolve([]),
      ]);
      if (!isCurrent()) return;

      // Сборку словарь не отдал: её удалили — или ей переписали параметры, и код
      // стал другим. (Чужая личная сюда дойдёт: по точной ссылке словарь не
      // фильтрует.) Норма осталась, но в расчёт такая строка уже не попадёт;
      // показываем её по ссылке, как есть.
      const unknown = (ref: string | number) =>
        t("pages.catalog.norms.unknown", { id: ref });

      const variantRows = (list: typeof materials, kind: NormKind) => {
        const byCode = new Map(
          (list ?? []).map((variant) => [variant.code, variant]),
        );
        return norms[kind].map((norm) => {
          const variant = byCode.get(String(norm.ref));
          return variant
            ? newRow(
                norm.ref,
                variant.owner.name,
                variantDetails(variant),
                variant.owner.unit ?? null,
                norm,
              )
            : newRow(norm.ref, unknown(norm.ref), "", null, norm);
        });
      };

      const toolsById = new Map(
        (powerTools ?? []).map((tool) => [tool.id, tool]),
      );
      rows.value = {
        materials: variantRows(materials, "materials"),
        handTools: variantRows(handTools, "handTools"),
        powerTools: norms.powerTools.map((norm) => {
          const tool = toolsById.get(Number(norm.ref));
          return tool
            ? newRow(norm.ref, tool.name, poweredBy(tool), null, norm)
            : newRow(norm.ref, unknown(norm.ref), "", null, norm);
        }),
      };
    } finally {
      loading.value = false;
    }
  }

  // Язык — тоже повод перечитать: названия приходят из словаря уже переведёнными.
  watch([systemId, stageId, locale], () => void load(), { immediate: true });

  function removeRow(kind: NormKind, row: Row) {
    rows.value[kind] = rows.value[kind].filter((item) => item !== row);
  }

  function openPicker(kind: NormKind) {
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
        kind === "materials"
          ? await DictionaryModel.materials(query)
          : kind === "handTools"
            ? await DictionaryModel.handTools(query)
            : await DictionaryModel.powerTools(query);
      // Пока искали, подбор закрыли или переключили на другой раздел.
      if (picker.kind !== kind || picker.q !== query.q) return;
      picker.results = page?.items ?? [];
    } finally {
      picker.loading = false;
    }
  }

  async function pickOwner(item: PickerItem) {
    const kind = picker.kind;
    if (!kind) return;

    if (kind === "powerTools") {
      const tool = item as DictionaryPowerTool;
      if (!has(kind, tool.id))
        rows.value[kind].push(
          newRow(tool.id, tool.name, poweredBy(tool), null),
        );
      closePicker();
      return;
    }

    const owner = item as DictionaryMaterial | DictionaryHandTool;
    picker.owner = owner;
    picker.variants = [];
    picker.loading = true;
    try {
      const variants = await DictionaryModel.variants(
        kind === "materials" ? "materials" : "hand-tools",
        owner.id,
      );
      if (picker.owner !== owner) return;
      // Удалённые из сборника сборки в подбор не предлагаем.
      picker.variants = (variants ?? []).filter((variant) => variant.isActive);
    } finally {
      picker.loading = false;
    }

    // Сборка одна — выбирать нечего.
    if (picker.variants.length === 1 && !has(kind, picker.variants[0].code)) {
      pickVariant(picker.variants[0]);
    }
  }

  function pickVariant(variant: DictionaryVariant) {
    const kind = picker.kind;
    const owner = picker.owner;
    if (!kind || !owner || has(kind, variant.code)) return;

    const unit = "unit" in owner ? owner.unit : null;
    rows.value[kind].push(
      newRow(variant.code, owner.name, variantDetails(variant), unit),
    );
    closePicker();
  }

  /** '1,05' с мобильной клавиатуры — тоже число. */
  function parseRate(raw: unknown): number | null {
    const text = String(raw ?? "")
      .trim()
      .replace(",", ".");
    const value = Number(text);
    return text && Number.isFinite(value) && value >= 0 ? value : null;
  }

  function toInput(): StageNormsInput | null {
    const result = {} as StageNormsInput;
    for (const { kind } of SECTIONS) {
      const list: StageNormsInput[NormKind] = [];
      for (const row of rows.value[kind]) {
        const rate = parseRate(row.rate);
        if (rate === null) return null;
        const note = row.note.trim() || null;
        list.push({
          ref: row.ref,
          rate,
          noteRu: suffix.value === "Ru" ? note : row.notes.noteRu,
          noteEn: suffix.value === "En" ? note : row.notes.noteEn,
        });
      }
      result[kind] = list;
    }
    return result;
  }

  /** Этап, в который писать: у чужой технологии — этап её копии с перенесёнными нормами. */
  async function targetStage(system: number, stage: number): Promise<number> {
    if (owns.value) return stage;

    if (!fork) {
      // PATCH без изменений: словарь заводит копию со всеми этапами и отвечает ею.
      const copy = await DictionaryModel.updateSystem(system, {});
      const stageIds = await mapCopyStages(system, copy.id);
      fork = { copyId: copy.id, stageIds, pendingNorms: new Map(stageIds) };
    }
    await copyStageNorms(fork.pendingNorms);

    const copyStageId = fork.stageIds.get(stage);
    if (copyStageId === undefined) {
      throw new Error("Этап копии технологии не найден");
    }
    return copyStageId;
  }

  async function save() {
    const system = systemId.value;
    const stage = stageId.value;
    if (system === null || stage === null || saving.value) return;

    const body = toInput();
    if (!body) {
      error.value = t("pages.catalog.norms.errors.invalid_rate");
      return;
    }

    saving.value = true;
    error.value = "";
    try {
      const target = await targetStage(system, stage);
      await NormsModel.replace(target, body);
      // Обратно к технологии — к копии, если сохранение её завело.
      await router.replace({
        name: "catalog-technology",
        params: {
          locale: route.params.locale,
          workType: route.params.workType,
          systemId: String(fork?.copyId ?? system),
        },
      });
    } catch (cause) {
      // 403 у норм — не «удалить может автор», а чужая технология без копии.
      error.value =
        cause instanceof HttpError && cause.status === 403
          ? t("pages.catalog.norms.errors.forbidden")
          : saveErrorText(t, cause);
    } finally {
      saving.value = false;
    }
  }
</script>

<style scoped>
  .hint {
    display: block;
    margin-bottom: 8px;
  }

  .section_hint {
    padding: 8px 16px 0;
  }

  /* Без рамки поле в строке не отличить от подписи, а выровненное вправо число
     прилипало к единице. */
  /*
   * Строка нормы — под телефон: название и значение идут вплотную друг под другом,
   * без стандартных 44px высоты у каждого ion-item и ion-input, иначе на экране
   * помещалось три позиции.
   */
  .norm_name {
    --min-height: 0;
    margin-top: 4px;
  }

  .norm_name ion-label {
    margin-bottom: 0;
  }

  .norm_name h3,
  .norm_name p {
    display: inline;
    margin: 0;
  }

  .norm_name h3 {
    margin-inline-end: 6px;
  }

  .norm_values {
    --min-height: 0;
  }

  /* Без рамки поле в строке не отличить от подписи. */
  .rate_input {
    width: 4.5em;
    min-height: 32px;
    margin-inline-end: 6px;
    text-align: end;
    --padding-top: 2px;
    --padding-bottom: 2px;
    --padding-end: 4px;
    border-bottom: 1px solid var(--ion-color-medium);
  }

  .rate_value {
    margin-inline-end: 6px;
  }

  .rate_unit {
    min-width: 2em;
    font-size: 0.85em;
    opacity: 0.7;
  }

  .note_text {
    font-size: 0.9em;
    color: rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.6);
  }

  .note_input {
    --color: rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.6);
    --placeholder-color: rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.6);
  }

  .picker {
    padding: 8px 0;
  }

  .save_btn {
    margin-top: 16px;
  }
</style>

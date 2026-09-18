<template>
  <ion-item v-if="!expandable">
    <ion-label>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
      <p v-if="description">{{ description }}</p>
      <!-- Питание не пишем: его и так видно по табу раздела. -->
    </ion-label>
    <ion-note
      v-if="ownerNote"
      slot="end"
    >
      {{ ownerNote }}
    </ion-note>
    <ion-button
      v-if="editable"
      slot="end"
      fill="clear"
      :aria-label="$t('pages.catalog.edit')"
      @click="emit('edit')"
    >
      <ion-icon
        slot="icon-only"
        :icon="createOutline"
      />
    </ion-button>
  </ion-item>

  <ion-accordion
    v-else
    :value="String(item.id)"
  >
    <ion-item slot="header">
      <ion-label>
        <h3>{{ title }}</h3>
        <p v-if="subtitle">{{ subtitle }}</p>
      </ion-label>
      <ion-note
        v-if="ownerNote"
        slot="end"
      >
        {{ ownerNote }}
      </ion-note>
      <!-- .stop: клик по карандашу иначе заодно раскрыл бы аккордеон. -->
      <ion-button
        v-if="editable"
        slot="end"
        fill="clear"
        :aria-label="$t('pages.catalog.edit')"
        @click.stop="emit('edit')"
      >
        <ion-icon
          slot="icon-only"
          :icon="createOutline"
        />
      </ion-button>
    </ion-item>

    <div
      slot="content"
      class="ion-padding-start ion-padding-end ion-padding-bottom"
    >
      <p v-if="description">{{ description }}</p>

      <!-- Раскрыли ради описания — блока типоразмеров нет вовсе. -->
      <template v-if="hasSizes">
        <ion-spinner
          v-if="activeVariants === undefined"
          name="dots"
        />
        <ion-note v-else-if="!activeVariants.length">
          {{ $t("pages.catalog.no_variants") }}
        </ion-note>
        <ion-list v-else>
          <ion-item
            v-for="variant in activeVariants"
            :key="variant.id"
            lines="none"
          >
            <ion-label :class="{ timber: isTimber }">
              <span v-if="!variant.params.length">
                {{ $t("pages.catalog.single_variant") }}
              </span>
              <span
                v-for="(label, index) in variantLabels(variant)"
                :key="index"
                class="param"
              >
                {{ label }}
              </span>
            </ion-label>
            <ion-note slot="end">{{ variant.code }}</ion-note>
            <ion-button
              v-if="variantsEditable"
              slot="end"
              fill="clear"
              :aria-label="$t('pages.catalog.params.edit_variant_aria')"
              @click="emit('editVariant', variant)"
            >
              <ion-icon
                slot="icon-only"
                :icon="createOutline"
              />
            </ion-button>
          </ion-item>
        </ion-list>
        <ion-button
          v-if="variantsEditable && activeVariants !== undefined"
          class="add_btn"
          fill="clear"
          size="small"
          @click="emit('addVariant')"
        >
          <ion-icon
            slot="start"
            :icon="addOutline"
          />
          <span class="slanted">{{ $t("pages.catalog.params.add_variant") }}</span>
        </ion-button>
      </template>
    </div>
  </ion-accordion>
</template>

<script setup lang="ts">
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { IonAccordion, IonIcon, IonNote } from "@ionic/vue";
  import { addOutline, createOutline } from "ionicons/icons";
  import type {
    DictionaryHandTool,
    DictionaryMaterial,
    DictionaryPowerTool,
    DictionaryVariant,
  } from "@/types/dto";
  import { useOwnership } from "./ownership";
  import { useParamLabel } from "./paramLabel";

  type CatalogEntry =
    | DictionaryMaterial
    | DictionaryHandTool
    | DictionaryPowerTool;

  /** code типа «Пиломатериалы» в словаре (material_types). */
  const TIMBER_TYPE = "timber";

  const props = defineProps<{
    item: CatalogEntry;
    /** Типоразмеры: undefined — ещё грузятся, [] — их нет. */
    variants?: DictionaryVariant[];
    /** Раскрывать ли: есть типоразмеры или описание — решает страница. */
    expandable: boolean;
    /** Есть ли настоящие типоразмеры (variantsCount > 0) — иначе раскрыли ради описания. */
    hasSizes: boolean;
    /** Показать карандаш «изменить»: страница решает, кому и в каком разделе. */
    editable?: boolean;
    /** Карандаш у каждой сборки и «добавить сборку» — страница решает, кому и где. */
    variantsEditable?: boolean;
  }>();
  const emit = defineEmits<{
    edit: [];
    editVariant: [variant: DictionaryVariant];
    addVariant: [];
  }>();

  const { t } = useI18n({ useScope: "global" });
  const { translate, formatNumber, paramLabel } = useParamLabel();
  const { isMine, isOthersPrivate } = useOwnership();

  // Имя и описание словарь отдаёт уже на языке интерфейса (Accept-Language).
  const title = computed(() => props.item.name);

  /**
   * Своё рядом с общим оригиналом («шпатель» и «шпатель888») помечаем, иначе их не
   * различить. Чужое личное видит только админ — ему видно, что это не общее.
   */
  const ownerNote = computed(() => {
    if (isMine(props.item)) return t("pages.catalog.structure.added_by_you");
    if (isOthersPrivate(props.item)) return t("pages.catalog.added_by_user");
    return "";
  });

  /**
   * Удалённые из формы сборки словарь по-прежнему отдаёт (is_active = false): на них
   * могут ссылаться нормы расхода. В сборнике их не показываем — удалили же.
   */
  const activeVariants = computed(() =>
    props.variants?.filter((variant) => variant.isActive),
  );

  const description = computed(() =>
    "description" in props.item ? props.item.description || "" : "",
  );

  /** У материала в подзаголовке — единица измерения. */
  const subtitle = computed(() => {
    if (!("unit" in props.item)) return "";
    const code = props.item.unit.code;
    return `${t("ui.labels.measure")}: ${translate(`measure.${code}`, code)}`;
  });

  /**
   * Пиломатериалы читают сечением, как пишут в прайсах: «дл. 6 м сеч. 100х25 мм».
   * Только подпись: в словаре это по-прежнему ширина и толщина отдельными
   * параметрами, так же их и заводят в форме.
   */
  const isTimber = computed(
    () => "type" in props.item && props.item.type?.code === TIMBER_TYPE,
  );

  function variantLabels(variant: DictionaryVariant): string[] {
    const { params } = variant;
    const width = params.find((param) => param.kind === "width");
    const thickness = params.find((param) => param.kind === "thickness");
    // Без пары в одной единице сечение не собрать — подпись как у всех.
    if (!isTimber.value || !width || !thickness || width.unit !== thickness.unit) {
      return params.map(paramLabel);
    }

    const unit = translate(`measure.${width.unit}`, width.unit);
    const section =
      `${t("ui.paramsTitles.section")} ` +
      `${formatNumber(width.value)}${t("ui.labels.by")}${formatNumber(thickness.value)} ${unit}`;
    const rest = params
      .filter((param) => param !== width && param !== thickness)
      .map(paramLabel);
    return [...rest, section];
  }
</script>

<style scoped>
  .param + .param::before {
    content: " × ";
    opacity: 0.5;
  }

  /* «дл. 6 м сеч. 100х25 мм»: × между длиной и сечением спорил бы с х внутри сечения. */
  .timber .param + .param::before {
    content: " ";
  }
</style>

<template>
  <ion-item v-if="!expandable">
    <ion-label>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
      <p v-if="description">{{ description }}</p>
      <!-- Питание есть только у электроинструмента: у остальных corded === undefined. -->
      <p v-if="corded !== undefined">
        {{ corded ? $t("pages.catalog.corded") : $t("pages.catalog.cordless") }}
      </p>
    </ion-label>
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
          v-if="variants === undefined"
          name="dots"
        />
        <ion-note v-else-if="!variants.length">
          {{ $t("pages.catalog.no_variants") }}
        </ion-note>
        <ion-list v-else>
          <ion-item
            v-for="variant in variants"
            :key="variant.id"
            lines="none"
          >
            <ion-label>
              <span v-if="!variant.params.length">
                {{ $t("pages.catalog.single_variant") }}
              </span>
              <span
                v-for="param in variant.params"
                :key="param.paramValueId"
                class="param"
              >
                {{ paramLabel(param) }}
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
          v-if="variantsEditable && variants !== undefined"
          fill="clear"
          size="small"
          @click="emit('addVariant')"
        >
          <ion-icon
            slot="start"
            :icon="addOutline"
          />
          {{ $t("pages.catalog.params.add_variant") }}
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
    DictionaryVariantParam,
  } from "@/types/dto";

  type CatalogEntry =
    | DictionaryMaterial
    | DictionaryHandTool
    | DictionaryPowerTool;

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

  const { t, te } = useI18n({ useScope: "global" });

  // Имя и описание словарь отдаёт уже на языке интерфейса (Accept-Language).
  const title = computed(() => props.item.name);

  const description = computed(() =>
    "description" in props.item ? props.item.description || "" : "",
  );

  /** У материала в подзаголовке — единица измерения. */
  const subtitle = computed(() => {
    if (!("unit" in props.item)) return "";
    const code = props.item.unit.code;
    return `${t("ui.labels.measure")}: ${translate(`measure.${code}`, code)}`;
  });

  const corded = computed(() =>
    "isCorded" in props.item ? props.item.isCorded : undefined,
  );

  /** Тип есть только у материалов, и он необязательный. */
  const materialType = computed(() => {
    if (!("type" in props.item) || !props.item.type) return "";
    return props.item.type.name;
  });

  /** Если ключа в словаре нет — показываем сам код, а не «measure.xyz». */
  function translate(key: string, fallback: string): string {
    return te(key) ? t(key) : fallback;
  }

  function paramLabel(param: DictionaryVariantParam): string {
    const value = Number(param.value);
    const number = Number.isFinite(value) ? String(value) : param.value;
    const unit = translate(`measure.${param.unit}`, param.unit);
    const kind = param.kind
      ? translate(`ui.paramsTitles.${param.kind}`, param.kind)
      : "";

    return kind ? `${kind} ${number} ${unit}` : `${number} ${unit}`;
  }
</script>

<style scoped>
  .param + .param::before {
    content: " × ";
    opacity: 0.5;
  }
</style>

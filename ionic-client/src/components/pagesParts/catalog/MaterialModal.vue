<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ heading }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            :aria-label="$t('ui.buttons.close')"
            @click="emit('close')"
          >
            <ion-icon
              slot="icon-only"
              :icon="closeOutline"
            />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div
        v-if="loading"
        class="ion-text-center ion-padding"
      >
        <ion-spinner />
      </div>

      <template v-else>
        <ion-list>
          <ion-item>
            <ion-input
              v-model="form.name"
              :label="$t('pages.catalog.structure.name')"
              label-placement="stacked"
              :placeholder="fallback.name"
              :maxlength="150"
            />
          </ion-item>
          <ion-item>
            <ion-textarea
              v-model="form.description"
              :label="$t('pages.catalog.structure.description')"
              label-placement="stacked"
              :placeholder="fallback.description"
              :auto-grow="true"
            />
          </ion-item>
          <ion-item>
            <ion-select
              v-model="form.unitId"
              :label="$t('pages.catalog.unit')"
              label-placement="stacked"
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
          </ion-item>
          <ion-item>
            <ion-select
              v-model="form.typeId"
              :label="$t('pages.catalog.type')"
              label-placement="stacked"
              interface="popover"
            >
              <ion-select-option :value="NO_TYPE">
                {{ $t("pages.catalog.untyped") }}
              </ion-select-option>
              <ion-select-option
                v-for="type in types"
                :key="type.id"
                :value="type.id"
              >
                {{ type.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <!-- Параметры — только у нового материала: у существующего каждая сборка правится своим карандашом. -->
        <section
          v-if="currentId === null"
          class="params"
        >
          <h4>{{ $t("pages.catalog.params.title") }}</h4>
          <VariantParamsEditor
            ref="editor"
            v-model="rows"
          />
        </section>

        <ion-text
          v-if="error"
          color="danger"
        >
          <p>{{ error }}</p>
        </ion-text>
        <CutCornerBtn
          class="save_btn"
          full-width
          :disabled="!canSave"
          @click="save"
        >
          {{ $t("ui.buttons.save") }}
        </CutCornerBtn>
      </template>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
  /**
   * Добавление и правка материала: material === null — новый, иначе — правка.
   *
   * Название и описание — на языке страницы, пишутся только в его колонки
   * (localeFields.ts). Чтобы править свой язык, нужны исходные поля, а список
   * отдаёт одно name, — форма берёт их отдельным запросом (?translations=all).
   *
   * Открывается только вошедшим: без токена словарь запись всё равно не примет.
   * Новый материал уходит сразу с параметрами первой сборки (13:205:226), одним
   * запросом; у существующего сборки правятся карандашом у каждой (VariantModal).
   */
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import {
    IonButtons,
    IonHeader,
    IonIcon,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToolbar,
  } from "@ionic/vue";
  import { closeOutline } from "ionicons/icons";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import DictionaryModel from "@/models/DictionaryModel";
  import type {
    DictionaryMaterial,
    DictionaryMaterialType,
    DictionaryUnit,
  } from "@/types/dto";
  import VariantParamsEditor from "./VariantParamsEditor.vue";
  import {
    field,
    inLocale,
    otherFilled,
    saveErrorText,
    suffixFor,
    type LocaleSuffix,
  } from "./localeFields";
  import { toInput, type ParamRow } from "./variantParams";

  /**
   * «Без типа» в селекте: ion-select не умеет честный null в значении опции,
   * поэтому 0 (id с нуля не начинаются), а в запрос уходит уже null.
   */
  const NO_TYPE = 0;

  type Form = {
    name: string;
    description: string;
    unitId: number | null;
    typeId: number;
  };

  const props = defineProps<{
    isOpen: boolean;
    material: DictionaryMaterial | null;
    units: DictionaryUnit[];
    types: DictionaryMaterialType[];
  }>();
  const emit = defineEmits<{ close: [] }>();

  const { t, locale } = useI18n({ useScope: "global" });

  const emptyForm = (): Form => ({
    name: "",
    description: "",
    unitId: null,
    typeId: NO_TYPE,
  });

  /** Язык, на котором открыли форму: в его колонки и пишем. */
  const suffix = ref<LocaleSuffix>("Ru");
  const currentId = ref<number | null>(null);
  const form = ref<Form>(emptyForm());
  const fallback = ref({ name: "", description: "" });
  const editor = ref<InstanceType<typeof VariantParamsEditor> | null>(null);
  /** Параметры первой сборки — только для нового материала. */
  const rows = ref<ParamRow[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref("");

  const heading = computed(() =>
    currentId.value === null
      ? t("pages.catalog.new_material")
      : t("pages.catalog.edit_material"),
  );

  // Своё поле можно оставить пустым, если название есть на другом языке.
  const canSave = computed(
    () =>
      !saving.value &&
      form.value.unitId !== null &&
      Boolean(form.value.name.trim() || fallback.value.name),
  );

  /** Каждое открытие — с чистого листа по тому, что сейчас в словаре. */
  async function reset() {
    error.value = "";
    suffix.value = suffixFor(locale.value);
    currentId.value = props.material?.id ?? null;
    form.value = emptyForm();
    fallback.value = { name: "", description: "" };
    rows.value = [];
    if (!props.material) return;

    const openedFor = props.material.id;
    loading.value = true;
    try {
      const material = await DictionaryModel.materialTranslations(openedFor);
      // Пока грузили, модалку переоткрыли на другом материале.
      if (currentId.value !== openedFor) return;
      // get() глотает сетевую ошибку: без исходных полей править нечего.
      if (!material) {
        error.value = t("pages.catalog.structure.errors.generic");
        return;
      }

      form.value = {
        name: field(material, "name", suffix.value),
        description: field(material, "description", suffix.value),
        unitId: material.unitId,
        typeId: material.typeId ?? NO_TYPE,
      };
      fallback.value = {
        name: otherFilled(material, "name", suffix.value),
        description: otherFilled(material, "description", suffix.value),
      };
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => props.isOpen,
    (open) => {
      if (open) void reset();
    },
  );

  async function save() {
    const unitId = form.value.unitId;
    if (!canSave.value || unitId === null) return;
    const problem = editor.value?.validate() ?? "";
    if (problem) {
      error.value = problem;
      return;
    }

    const name = form.value.name.trim();
    const description = form.value.description.trim();
    const body = {
      ...inLocale("name", name || null, suffix.value),
      ...inLocale("description", description || null, suffix.value),
      unitId,
      typeId: form.value.typeId === NO_TYPE ? null : form.value.typeId,
    };

    saving.value = true;
    error.value = "";
    try {
      if (currentId.value === null) {
        // Без параметров — пустой список: словарь сам заведёт сборку с code = id.
        const params = rows.value.map(toInput);
        await DictionaryModel.createMaterial({
          ...body,
          variants: params.length ? [params] : [],
        });
      } else {
        // Пустое своё поле уходит null и стирает только этот язык: остальные
        // остаются, их и покажут. Последнее название стереть не даст база (400).
        await DictionaryModel.updateMaterial(currentId.value, body);
      }
      emit("close");
    } catch (cause) {
      error.value = saveErrorText(t, cause);
    } finally {
      saving.value = false;
    }
  }
</script>

<style scoped>
  .params {
    margin-top: 20px;
  }

  .params h4 {
    margin: 0;
    font-size: 1rem;
  }

  .save_btn {
    margin-top: 16px;
  }
</style>

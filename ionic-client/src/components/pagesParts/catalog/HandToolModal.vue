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
              v-model="name"
              :label="$t('pages.catalog.structure.name')"
              label-placement="stacked"
              :placeholder="fallback"
              :maxlength="100"
            />
          </ion-item>
        </ion-list>

        <!-- Параметры — только у новой позиции: у существующей каждая сборка правится своим карандашом. -->
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
   * Базовая позиция ручного инструмента («малярная кисть», id 7): tool === null — новая.
   *
   * Сама по себе она в расчёт не идёт — идут её сборки (7:227). Поэтому новая позиция
   * заводится сразу с параметрами первой сборки, одним запросом; без параметров
   * словарь заведёт сборку с code = id. У существующей здесь правится только
   * название, сборки — карандашом у каждой в раскрытом списке (VariantModal).
   *
   * Название — на языке страницы (localeFields.ts); исходные поля форма берёт
   * отдельным запросом (?translations=all): список отдаёт одно name, уже свёрнутое.
   */
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { IonButtons, IonHeader, IonIcon, IonModal, IonToolbar } from "@ionic/vue";
  import { closeOutline } from "ionicons/icons";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import DictionaryModel from "@/models/DictionaryModel";
  import type { DictionaryHandTool } from "@/types/dto";
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

  const props = defineProps<{
    isOpen: boolean;
    tool: DictionaryHandTool | null;
  }>();
  const emit = defineEmits<{ close: [] }>();

  const { t, locale } = useI18n({ useScope: "global" });

  const editor = ref<InstanceType<typeof VariantParamsEditor> | null>(null);
  /** Язык, на котором открыли форму: в его колонку и пишем. */
  const suffix = ref<LocaleSuffix>("Ru");
  const currentId = ref<number | null>(null);
  const name = ref("");
  const fallback = ref("");
  const rows = ref<ParamRow[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref("");

  const heading = computed(() =>
    currentId.value === null
      ? t("pages.catalog.new_hand_tool")
      : t("pages.catalog.edit_hand_tool"),
  );

  // Своё поле можно оставить пустым, если название есть на другом языке.
  const canSave = computed(
    () => !saving.value && Boolean(name.value.trim() || fallback.value),
  );

  /** Каждое открытие — с чистого листа по тому, что сейчас в словаре. */
  async function reset() {
    error.value = "";
    suffix.value = suffixFor(locale.value);
    currentId.value = props.tool?.id ?? null;
    name.value = "";
    fallback.value = "";
    rows.value = [];
    if (!props.tool) return;

    const openedFor = props.tool.id;
    loading.value = true;
    try {
      const tool = await DictionaryModel.handToolTranslations(openedFor);
      // Пока грузили, модалку переоткрыли на другом инструменте.
      if (currentId.value !== openedFor) return;
      // get() глотает сетевую ошибку: без исходных полей править нечего.
      if (!tool) {
        error.value = t("pages.catalog.structure.errors.generic");
        return;
      }

      name.value = field(tool, "name", suffix.value);
      fallback.value = otherFilled(tool, "name", suffix.value);
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
    if (!canSave.value) return;
    const problem = editor.value?.validate() ?? "";
    if (problem) {
      error.value = problem;
      return;
    }

    const body = inLocale("name", name.value.trim() || null, suffix.value);

    saving.value = true;
    error.value = "";
    try {
      if (currentId.value === null) {
        // Без параметров — пустой список: словарь сам заведёт сборку с code = id.
        const params = rows.value.map(toInput);
        await DictionaryModel.createHandTool({
          ...body,
          variants: params.length ? [params] : [],
        });
      } else {
        // Пустое своё поле уходит null и стирает только этот язык; последнее
        // название стереть не даст база (CHECK hand_tools_name_present).
        await DictionaryModel.updateHandTool(currentId.value, body);
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

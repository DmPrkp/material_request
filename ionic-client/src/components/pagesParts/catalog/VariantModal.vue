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
      <h4 class="owner_name">{{ ownerName }}</h4>

      <VariantParamsEditor
        ref="editor"
        v-model="rows"
      />

      <ion-text
        v-if="error"
        color="danger"
      >
        <p>{{ error }}</p>
      </ion-text>
      <CutCornerBtn
        class="save_btn"
        full-width
        :disabled="saving"
        @click="save"
      >
        {{ $t("ui.buttons.save") }}
      </CutCornerBtn>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
  /**
   * Одна сборка позиции — ручного инструмента (7:227) или материала (13:205:226):
   * variant === null — новая, иначе — правка.
   *
   * Правка заменяет набор параметров целиком: id сборки прежний — на него ссылаются
   * нормы расхода, — а code словарь пересчитывает. Поля самой позиции здесь не
   * правятся — это карандаш у неё (HandToolModal, MaterialModal).
   */
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { IonButtons, IonHeader, IonIcon, IonModal, IonToolbar } from "@ionic/vue";
  import { closeOutline } from "ionicons/icons";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import DictionaryModel, { type VariantOwner } from "@/models/DictionaryModel";
  import { HttpError } from "@/models/BaseModel";
  import type { DictionaryVariant } from "@/types/dto";
  import VariantParamsEditor from "./VariantParamsEditor.vue";
  import { saveErrorText } from "./localeFields";
  import { newRow, rowFromParam, toInput, type ParamRow } from "./variantParams";

  const props = defineProps<{
    isOpen: boolean;
    owner: VariantOwner;
    ownerId: number | null;
    /** Название позиции — над параметрами, чтобы было видно, чья сборка. */
    ownerName: string;
    variant: DictionaryVariant | null;
  }>();
  const emit = defineEmits<{ close: [] }>();

  const { t } = useI18n({ useScope: "global" });

  const editor = ref<InstanceType<typeof VariantParamsEditor> | null>(null);
  const rows = ref<ParamRow[]>([]);
  const saving = ref(false);
  const error = ref("");

  const heading = computed(() =>
    props.variant
      ? t("pages.catalog.params.edit_variant", { code: props.variant.code })
      : t("pages.catalog.params.new_variant"),
  );

  // Параметры сборки уже пришли в списке (с kindId/unitId) — отдельный запрос не нужен.
  watch(
    () => props.isOpen,
    (open) => {
      if (!open) return;
      error.value = "";
      rows.value = props.variant
        ? props.variant.params.map(rowFromParam)
        : [newRow()];
    },
  );

  async function save() {
    const ownerId = props.ownerId;
    if (saving.value || ownerId === null) return;
    const problem = editor.value?.validate() ?? "";
    if (problem) {
      error.value = problem;
      return;
    }

    const params = rows.value.map(toInput);
    saving.value = true;
    error.value = "";
    try {
      if (props.variant) {
        await DictionaryModel.updateVariant(props.owner, ownerId, props.variant.id, params);
      } else {
        await DictionaryModel.createVariant(props.owner, ownerId, params);
      }
      emit("close");
    } catch (cause) {
      // 409 здесь — не название, а сборка с тем же набором параметров.
      error.value =
        cause instanceof HttpError && cause.status === 409
          ? t("pages.catalog.params.exists")
          : saveErrorText(t, cause);
    } finally {
      saving.value = false;
    }
  }
</script>

<style scoped>
  .owner_name {
    margin: 0 0 8px;
  }

  .save_btn {
    margin-top: 16px;
  }
</style>

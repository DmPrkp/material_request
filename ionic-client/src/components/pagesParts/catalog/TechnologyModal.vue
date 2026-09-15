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

      <template v-else-if="canEdit">
        <!-- Чужая общая технология: сохранение заведёт копию вместе с этапами. -->
        <ion-note
          v-if="!ownsCurrent"
          class="copy_hint"
        >
          {{ $t("pages.catalog.copy_hint") }}
        </ion-note>
        <ion-list>
          <ion-item>
            <ion-input
              v-model="form.name"
              :label="$t('pages.catalog.structure.name')"
              label-placement="stacked"
              :placeholder="fallback.name"
              :maxlength="100"
            />
          </ion-item>
          <ion-item>
            <ion-input
              v-model="form.description"
              :label="$t('pages.catalog.structure.description')"
              label-placement="stacked"
              :placeholder="fallback.description"
              :maxlength="200"
            />
          </ion-item>
        </ion-list>

        <ion-list>
          <ion-list-header>
            {{ $t("pages.catalog.structure.stages") }}
          </ion-list-header>
          <ion-item
            v-for="(row, index) in rows"
            :key="row.key"
          >
            <span
              slot="start"
              class="stage_index"
            >
              {{ index + 1 }}.
            </span>
            <ion-input
              v-model="row.name"
              :aria-label="$t('pages.catalog.structure.stage_name')"
              :placeholder="row.fallback || $t('pages.catalog.structure.stage_name')"
              :maxlength="100"
            />
          </ion-item>
        </ion-list>
        <ion-button
          class="add_btn"
          fill="clear"
          @click="addRow"
        >
          <ion-icon
            slot="start"
            :icon="addOutline"
          />
          <span class="slanted">{{ $t("pages.catalog.structure.add_stage") }}</span>
        </ion-button>

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
        <!-- Удаление — только тут, в форме, а не в общем списке: своё — автору, любое — админу. -->
        <ion-button
          v-if="currentId !== null && ownsCurrent"
          class="delete_btn"
          expand="block"
          fill="clear"
          color="danger"
          :disabled="saving"
          @click="remove"
        >
          <ion-icon
            slot="start"
            :icon="trashOutline"
          />
          {{ $t("pages.catalog.delete") }}
        </ion-button>
      </template>

      <!-- Аноним: только посмотреть. Запись без входа словарь всё равно не примет. -->
      <template v-else-if="system">
        <h2>{{ system.name }}</h2>
        <p v-if="system.description">{{ system.description }}</p>
        <ion-list v-if="stages.length">
          <ion-list-header>
            {{ $t("pages.catalog.structure.stages") }}
          </ion-list-header>
          <ion-item
            v-for="stage in stages"
            :key="stage.id"
            lines="none"
          >
            <ion-label>{{ stage.position }}. {{ stage.name }}</ion-label>
          </ion-item>
        </ion-list>
        <ion-note v-else>
          {{ $t("pages.catalog.structure.no_stages") }}
        </ion-note>
      </template>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
  /**
   * Одна модалка на добавление и правку технологии вместе с её этапами:
   * system === null — новая технология, иначе — правка существующей.
   *
   * Название и описание вводятся на языке страницы и пишутся только в его колонки
   * (см. localeFields.ts); в пустом поле подсказкой стоит то, что сейчас видят на
   * этом языке. Чтобы править свой язык, нужны исходные поля, а список отдаёт одно
   * name, — их форма берёт отдельным запросом (?translations=all).
   *
   * Технология и этапы — отдельные записи словаря, одной транзакции на них нет.
   * Поэтому сохранение запоминает, что уже доехало: упал третий этап — повторное
   * «Сохранить» не создаст технологию и первые этапы второй раз, а доделает остальное.
   *
   * Чужая общая технология правится в копии: первым идёт PATCH самой технологии —
   * словарь заводит копию со всеми этапами и отвечает ею, с новым id, — а этапы
   * формы переезжают на этапы копии по позиции (adoptCopy). Этапы чужой технологии
   * напрямую словарь не даст править (403): они — её часть.
   */
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import {
    IonButtons,
    IonHeader,
    IonIcon,
    IonListHeader,
    IonModal,
    IonNote,
    IonToolbar,
  } from "@ionic/vue";
  import { addOutline, closeOutline, trashOutline } from "ionicons/icons";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import DictionaryModel from "@/models/DictionaryModel";
  import type { DictionarySystem, DictionaryWorkStage } from "@/types/dto";
  import {
    field,
    inLocale,
    otherFilled,
    saveErrorText,
    suffixFor,
    type LocaleSuffix,
  } from "./localeFields";
  import { confirmDelete, useOwnership } from "./ownership";

  type Texts = { name: string; description: string };

  type StageRow = {
    key: string;
    /** Есть — этап уже в словаре; нет — новая строка. */
    id?: number;
    /** Позиция этапа в словаре: по ней строка находит своего двойника в копии. */
    position?: number;
    name: string;
    /** Что лежит в словаре на этом языке: правим только изменившееся. */
    saved: string;
    /** Ближайшее заполненное на других языках — подсказка в пустом поле. */
    fallback: string;
  };

  const props = defineProps<{
    isOpen: boolean;
    /** Уже на языке страницы — для заголовка и просмотра анонимом. */
    system: DictionarySystem | null;
    /** Этапы технологии по порядку, на языке страницы; у новой — пусто. */
    stages: DictionaryWorkStage[];
    /** Куда класть новую технологию. */
    workTypeId?: number;
    canEdit: boolean;
  }>();
  const emit = defineEmits<{ close: [] }>();

  const { t, locale } = useI18n({ useScope: "global" });
  const { canModify } = useOwnership();

  const emptyTexts = (): Texts => ({ name: "", description: "" });

  /** Язык, на котором открыли форму: в его колонки и пишем. */
  const suffix = ref<LocaleSuffix>("Ru");
  const currentId = ref<number | null>(null);
  /**
   * Открытая технология своя (или любая у админа) — правится на месте. Нет —
   * первое сохранение заведёт копию, и дальше форма правит уже её.
   */
  const ownsCurrent = ref(true);
  const form = ref<Texts>(emptyTexts());
  const savedForm = ref<Texts>(emptyTexts());
  const fallback = ref<Texts>(emptyTexts());
  const rows = ref<StageRow[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref("");
  let rowSeq = 0;

  const heading = computed(() =>
    currentId.value === null
      ? t("pages.catalog.structure.new_system")
      : t("pages.catalog.structure.edit_system"),
  );

  // Своё поле можно оставить пустым, если название есть на другом языке, —
  // например, под /en поправить этапы технологии, заведённой по-русски.
  const canSave = computed(
    () => !saving.value && Boolean(form.value.name.trim() || fallback.value.name),
  );

  function newRow(): StageRow {
    return { key: `new-${++rowSeq}`, name: "", saved: "", fallback: "" };
  }

  function addRow() {
    rows.value.push(newRow());
  }

  /** Каждое открытие — с чистого листа по тому, что сейчас в словаре. */
  async function reset() {
    error.value = "";
    suffix.value = suffixFor(locale.value);
    currentId.value = props.system?.id ?? null;
    ownsCurrent.value = props.system === null || canModify(props.system);
    form.value = emptyTexts();
    savedForm.value = emptyTexts();
    fallback.value = emptyTexts();
    rows.value = [];

    if (!props.system) {
      rows.value = [newRow()];
      return;
    }
    // Анониму хватает того, что уже пришло на языке страницы.
    if (!props.canEdit) return;

    const openedFor = props.system.id;
    const lang = suffix.value;
    loading.value = true;
    try {
      const [system, stagesPage] = await Promise.all([
        DictionaryModel.systemTranslations(openedFor),
        DictionaryModel.workStageTranslations(openedFor),
      ]);
      // Пока грузили, модалку переоткрыли на другой технологии.
      if (currentId.value !== openedFor) return;
      // get() глотает сетевую ошибку: без исходных полей править нечего.
      if (!system || !stagesPage) {
        error.value = t("pages.catalog.structure.errors.generic");
        return;
      }

      form.value = {
        name: field(system, "name", lang),
        description: field(system, "description", lang),
      };
      savedForm.value = { ...form.value };
      fallback.value = {
        name: otherFilled(system, "name", lang),
        description: otherFilled(system, "description", lang),
      };
      rows.value = [...stagesPage.items]
        .sort((a, b) => a.position - b.position)
        .map((stage) => {
          const own = field(stage, "name", lang);
          return {
            key: `stage-${stage.id}`,
            id: stage.id,
            position: stage.position,
            name: own,
            saved: own,
            fallback: otherFilled(stage, "name", lang),
          };
        });
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

  /**
   * Словарь завёл копию чужой технологии: этапы у неё те же, с теми же позициями, —
   * по позиции строки формы и находят своих двойников. Дальше правим копию.
   */
  async function adoptCopy(copyId: number) {
    const stagesPage = await DictionaryModel.workStageTranslations(copyId);
    // Без этапов копии правка ушла бы в этапы оригинала — там её не примут (403).
    if (!stagesPage) throw new Error("Этапы копии технологии не пришли");

    const byPosition = new Map(
      stagesPage.items.map((stage) => [stage.position, stage.id]),
    );
    for (const row of rows.value) {
      if (row.position !== undefined) row.id = byPosition.get(row.position);
    }
    currentId.value = copyId;
    ownsCurrent.value = true;
  }

  async function saveSystem(stagesChanged: boolean): Promise<number> {
    const name = form.value.name.trim();
    const description = form.value.description.trim();
    const values = {
      ...inLocale("name", name || null, suffix.value),
      ...inLocale("description", description || null, suffix.value),
    };
    const textsChanged =
      name !== savedForm.value.name.trim() ||
      description !== savedForm.value.description.trim();

    if (currentId.value === null) {
      if (!props.workTypeId) throw new Error("workTypeId is required");
      const created = await DictionaryModel.createSystem({
        ...values,
        workTypeId: props.workTypeId,
      });
      currentId.value = created.id;
    } else if (textsChanged || (!ownsCurrent.value && stagesChanged)) {
      // У чужой — и когда поменялись только этапы: иначе копии не будет,
      // а этапы оригинала словарь пользователю править не даст.
      const saved = await DictionaryModel.updateSystem(currentId.value, values);
      if (saved.id !== currentId.value) await adoptCopy(saved.id);
    }

    savedForm.value = { name, description };
    return currentId.value;
  }

  async function save() {
    if (!canSave.value) return;

    // Стереть у этапа последнее название нельзя: его не показать ни на одном языке.
    if (
      rows.value.some(
        (row) => row.id !== undefined && !row.name.trim() && !row.fallback,
      )
    ) {
      error.value = t("pages.catalog.structure.errors.stage_name_required");
      return;
    }

    saving.value = true;
    error.value = "";
    try {
      const stagesChanged = rows.value.some(
        (row) => row.name.trim() !== row.saved,
      );
      const systemId = await saveSystem(stagesChanged);

      // По одному и по порядку: без position словарь ставит новый этап последним,
      // и параллельные запросы перемешали бы строки.
      for (const row of rows.value) {
        const name = row.name.trim();
        // Не менялось — не трогаем; новая пустая строка — просто незаполненная.
        if (name === row.saved) continue;

        if (row.id === undefined) {
          const created = await DictionaryModel.createWorkStage({
            ...inLocale("name", name, suffix.value),
            systemId,
          });
          row.id = created.id;
          row.position = created.position;
        } else {
          // Пусто — стираем только этот язык; остальные остаются, их и покажут.
          await DictionaryModel.updateWorkStage(
            row.id,
            inLocale("name", name || null, suffix.value),
          );
        }
        row.saved = name;
      }

      emit("close");
    } catch (cause) {
      error.value = saveErrorText(t, cause);
    } finally {
      saving.value = false;
    }
  }

  async function remove() {
    const id = currentId.value;
    if (id === null || saving.value) return;
    const name = form.value.name.trim() || fallback.value.name;
    if (!(await confirmDelete(t, name))) return;

    saving.value = true;
    error.value = "";
    try {
      await DictionaryModel.removeSystem(id);
      emit("close");
    } catch (cause) {
      error.value = saveErrorText(t, cause);
    } finally {
      saving.value = false;
    }
  }
</script>

<style scoped>
  .copy_hint {
    display: block;
    margin-bottom: 8px;
  }

  .stage_index {
    min-width: 2em;
  }

  .save_btn {
    margin-top: 16px;
  }

  .delete_btn {
    margin-top: 8px;
  }
</style>

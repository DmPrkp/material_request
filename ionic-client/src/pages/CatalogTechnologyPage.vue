<template>
  <ion-page v-if="route.name === 'catalog-technology'">
    <ion-content>
      <div class="ion-padding">
        <ion-item-divider>
          <ion-title>{{ heading }}</ion-title>
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
          {{ $t("pages.catalog.structure.not_found") }}
        </ion-note>

        <template v-else-if="canEdit">
          <!-- Чужая общая технология: сохранение заведёт копию вместе с этапами и нормами. -->
          <ion-note
            v-if="!ownsCurrent"
            class="hint"
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
            <ion-item>
              <ion-select
                v-model="unitId"
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
                :placeholder="
                  row.fallback || $t('pages.catalog.structure.stage_name')
                "
                :maxlength="100"
              />
              <!-- У новой строки ещё нет id — нормам не к чему привязаться до сохранения. -->
              <ion-button
                v-if="row.id !== undefined"
                slot="end"
                fill="clear"
                :aria-label="$t('pages.catalog.norms.open')"
                :disabled="saving"
                @click="openStage(row.id)"
              >
                <ion-icon
                  slot="icon-only"
                  :icon="chevronForwardOutline"
                />
              </ion-button>
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
            <span class="slanted">{{
              $t("pages.catalog.structure.add_stage")
            }}</span>
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
          <p v-if="system.description">{{ system.description }}</p>
          <p v-if="viewUnit">
            {{ $t("pages.catalog.unit") }}: {{ unitLabel(viewUnit) }}
          </p>
          <ion-list v-if="stages.length">
            <ion-list-header>
              {{ $t("pages.catalog.structure.stages") }}
            </ion-list-header>
            <ion-item
              v-for="stage in stages"
              :key="stage.id"
              button
              :detail="true"
              @click="openStage(stage.id)"
            >
              <ion-label>{{ stage.position }}. {{ stage.name }}</ion-label>
            </ion-item>
          </ion-list>
          <ion-note v-else>
            {{ $t("pages.catalog.structure.no_stages") }}
          </ion-note>
        </template>

        <!-- Новую технологию без входа не завести; вид — общий, как на заявках. -->
        <ion-item
          v-else
          class="auth-warning"
          button
          lines="none"
          @click="goToAuth"
        >
          <IonIcon
            slot="start"
            :icon="alertCircle"
          />
          <ion-label class="ion-text-wrap">
            {{ $t("pages.catalog.structure.sign_in") }}
          </ion-label>
        </ion-item>
      </div>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  /**
   * Технология работ (/catalog/systems/:workType/:systemId) вместе с её этапами;
   * :systemId = new — новая технология. Этап открывается своей страницей с нормами
   * расхода (CatalogStagePage), она вложена в эту: пока открыт этап, форма здесь
   * не размонтируется и несохранённое в ней не теряется.
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
   * формы переезжают на этапы копии по позиции. Нормы этапов живут в calc-server,
   * копия их не уносит — переносим сами (technologyCopy.ts).
   */
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import {
    IonIcon,
    IonListHeader,
    IonNote,
    IonSelect,
    IonSelectOption,
  } from "@ionic/vue";
  import {
    addOutline,
    alertCircle,
    chevronForwardOutline,
    trashOutline,
  } from "ionicons/icons";
  import {
    field,
    inLocale,
    otherFilled,
    saveErrorText,
    suffixFor,
    type LocaleSuffix,
  } from "@/components/pagesParts/catalog/localeFields";
  import {
    confirmDelete,
    useOwnership,
  } from "@/components/pagesParts/catalog/ownership";
  import {
    copyStageNorms,
    mapCopyStages,
  } from "@/components/pagesParts/catalog/technologyCopy";
  import { useUnitLabel } from "@/components/pagesParts/catalog/unitLabel";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import DictionaryModel from "@/models/DictionaryModel";
  import { useAuthStore } from "@/store/auth";
  import { useWorkTypesStore } from "@/store/workTypes";
  import type {
    DictionarySystem,
    DictionaryUnit,
    DictionaryWorkStage,
  } from "@/types/dto";

  /** Единица новой технологии по умолчанию — ею был подписан калькулятор до выбора. */
  const DEFAULT_UNIT_CODE = "m2";

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

  const { t, locale } = useI18n({ useScope: "global" });
  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const workTypesStore = useWorkTypesStore();
  const { canModify } = useOwnership();
  const unitLabel = useUnitLabel();

  // Не зависит от AUTH_ENABLED: запись без токена словарь всё равно не примет.
  const canEdit = computed(() => authStore.isAuthenticated);

  /** null — адрес /new. */
  const routeSystemId = computed(() => {
    const raw = route.params.systemId;
    const parsed = typeof raw === "string" ? Number(raw) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });

  const emptyTexts = (): Texts => ({ name: "", description: "" });

  /** Язык, на котором открыли форму: в его колонки и пишем. */
  const suffix = ref<LocaleSuffix>("Ru");
  /** Технология формы; после копии — уже копия, хотя адрес ещё прежний. */
  const currentId = ref<number | null>(null);
  /** На языке страницы — для заголовка и просмотра анонимом. */
  const system = ref<DictionarySystem | null>(null);
  const stages = ref<DictionaryWorkStage[]>([]);
  /**
   * Открытая технология своя (или любая у админа) — правится на месте. Нет —
   * первое сохранение заведёт копию, и дальше форма правит уже её.
   */
  const ownsCurrent = ref(true);
  const form = ref<Texts>(emptyTexts());
  const savedForm = ref<Texts>(emptyTexts());
  const fallback = ref<Texts>(emptyTexts());
  /** Единица объёма; null — список единиц ещё не пришёл, сохранить нельзя. */
  const unitId = ref<number | null>(null);
  const savedUnitId = ref<number | null>(null);
  /** Полные названия на языке страницы — для селекта. */
  const units = ref<DictionaryUnit[]>([]);
  const rows = ref<StageRow[]>([]);
  /**
   * Нормы, которые ещё надо перенести на этапы копии: этап оригинала -> этап копии.
   * Упал перенос — доделаем на следующем сохранении или переходе к этапу.
   */
  const pendingNormCopies = ref(new Map<number, number>());
  const loading = ref(false);
  const notFound = ref(false);
  const saving = ref(false);
  const error = ref("");
  /** Что загружено: адрес и язык. Совпало — не перечитываем и не теряем правки формы. */
  let loadedKey = "";
  let rowSeq = 0;

  const heading = computed(() => {
    if (routeSystemId.value === null) {
      return t("pages.catalog.structure.new_system");
    }
    return system.value?.name || t("pages.catalog.structure.edit_system");
  });

  const viewUnit = computed(
    () => units.value.find((unit) => unit.id === system.value?.unitId) ?? null,
  );

  // Своё поле можно оставить пустым, если название есть на другом языке, —
  // например, под /en поправить этапы технологии, заведённой по-русски.
  const canSave = computed(
    () =>
      !saving.value &&
      unitId.value !== null &&
      Boolean(form.value.name.trim() || fallback.value.name),
  );

  function newRow(): StageRow {
    return { key: `new-${++rowSeq}`, name: "", saved: "", fallback: "" };
  }

  function addRow() {
    rows.value.push(newRow());
  }

  async function loadUnits() {
    const page = await DictionaryModel.units();
    // get() глотает сетевую ошибку — тогда селект пуст, и сохранить не дадут.
    if (page) units.value = page.items;
  }

  async function load() {
    const id = routeSystemId.value;
    const lang = suffixFor(locale.value);
    const key = `${route.params.systemId}|${lang}|${canEdit.value}`;

    // Вернулись со страницы этапа, или она сама перевела адрес на копию, которую
    // эта форма уже правит, — перечитывать нечего.
    if (
      key === loadedKey ||
      (id !== null && id === currentId.value && loadedKey)
    ) {
      loadedKey = key;
      return;
    }
    loadedKey = key;

    error.value = "";
    notFound.value = false;
    suffix.value = lang;
    currentId.value = id;
    system.value = null;
    stages.value = [];
    ownsCurrent.value = true;
    form.value = emptyTexts();
    savedForm.value = emptyTexts();
    fallback.value = emptyTexts();
    unitId.value = null;
    savedUnitId.value = null;
    rows.value = [];
    pendingNormCopies.value = new Map();

    loading.value = true;
    try {
      if (id === null) {
        if (!canEdit.value) return;
        rows.value = [newRow()];
        await loadUnits();
        unitId.value =
          units.value.find((unit) => unit.code === DEFAULT_UNIT_CODE)?.id ??
          null;
        return;
      }

      const [found, translations, stagesPage, viewStages] = await Promise.all([
        DictionaryModel.system(id),
        canEdit.value ? DictionaryModel.systemTranslations(id) : undefined,
        canEdit.value ? DictionaryModel.workStageTranslations(id) : undefined,
        canEdit.value ? undefined : DictionaryModel.systemStages(id),
        loadUnits(),
      ]);
      // Пока грузили, ушли на другую технологию.
      if (routeSystemId.value !== id) return;

      // Чужая личная технология словарём не отдаётся — как несуществующая.
      if (!found) {
        notFound.value = true;
        return;
      }
      system.value = found;
      ownsCurrent.value = canModify(found);

      if (!canEdit.value) {
        stages.value = viewStages ?? [];
        return;
      }

      // get() глотает сетевую ошибку: без исходных полей править нечего.
      if (!translations || !stagesPage) {
        error.value = t("pages.catalog.structure.errors.generic");
        return;
      }

      form.value = {
        name: field(translations, "name", lang),
        description: field(translations, "description", lang),
      };
      savedForm.value = { ...form.value };
      unitId.value = translations.unitId;
      savedUnitId.value = translations.unitId;
      fallback.value = {
        name: otherFilled(translations, "name", lang),
        description: otherFilled(translations, "description", lang),
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

  // Под этапом (вложенный роут) systemId тот же — форма не перечитывается.
  watch([() => route.params.systemId, locale, canEdit], () => void load(), {
    immediate: true,
  });

  /** Словарь завёл копию: строки формы переезжают на этапы копии, нормы — следом. */
  async function adoptCopy(sourceId: number, copyId: number) {
    const stageIds = await mapCopyStages(sourceId, copyId);
    for (const row of rows.value) {
      if (row.id !== undefined) row.id = stageIds.get(row.id);
    }
    currentId.value = copyId;
    ownsCurrent.value = true;
    pendingNormCopies.value = stageIds;
    await copyStageNorms(pendingNormCopies.value);
  }

  async function saveSystem(stagesChanged: boolean): Promise<number> {
    const name = form.value.name.trim();
    const description = form.value.description.trim();
    const unit = unitId.value;
    if (unit === null) throw new Error("unitId is required");
    const values = {
      ...inLocale("name", name || null, suffix.value),
      ...inLocale("description", description || null, suffix.value),
      unitId: unit,
    };
    const textsChanged =
      name !== savedForm.value.name.trim() ||
      description !== savedForm.value.description.trim() ||
      unit !== savedUnitId.value;

    if (currentId.value === null) {
      const workTypes = await workTypesStore.load(locale.value);
      const workType = workTypes.find(
        (item) => item.code === route.params.workType,
      );
      if (!workType) throw new Error("workTypeId is required");
      const created = await DictionaryModel.createSystem({
        ...values,
        workTypeId: workType.id,
      });
      currentId.value = created.id;
    } else if (textsChanged || (!ownsCurrent.value && stagesChanged)) {
      // У чужой — и когда поменялись только этапы: иначе копии не будет,
      // а этапы оригинала словарь пользователю править не даст.
      const sourceId = currentId.value;
      const saved = await DictionaryModel.updateSystem(sourceId, values);
      if (saved.id !== sourceId) await adoptCopy(sourceId, saved.id);
    }

    savedForm.value = { name, description };
    savedUnitId.value = unit;
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
      await copyStageNorms(pendingNormCopies.value);
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

      goToList();
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
      goToList();
    } catch (cause) {
      error.value = saveErrorText(t, cause);
    } finally {
      saving.value = false;
    }
  }

  /**
   * К нормам этапа. Если форма уже правит копию — к этапу копии, и сперва дотягиваем
   * её нормы: иначе страница этапа показала бы копию пустой.
   */
  async function openStage(stageId: number) {
    const id = currentId.value;
    if (id === null) return;
    try {
      await copyStageNorms(pendingNormCopies.value);
    } catch (cause) {
      error.value = saveErrorText(t, cause);
      return;
    }
    router.push({
      name: "catalog-stage",
      params: {
        locale: route.params.locale,
        workType: route.params.workType,
        systemId: String(id),
        stageId: String(stageId),
      },
    });
  }

  function goToList() {
    // Следующий заход на эту технологию — с чистого листа, по тому, что в словаре.
    loadedKey = "";
    router.replace({
      name: "catalog-work-type",
      params: { locale: route.params.locale, workType: route.params.workType },
    });
  }

  function goToAuth() {
    router.push({
      name: "auth",
      params: { locale: route.params.locale },
      query: { redirect: route.fullPath },
    });
  }
</script>

<style scoped>
  .hint {
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

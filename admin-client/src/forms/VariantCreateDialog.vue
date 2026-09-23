<template>
  <Dialog
    :visible="visible"
    :header="isMaterial ? 'Новая сборка материала' : 'Новая сборка ручного инструмента'"
    modal
    :style="{ width: '680px' }"
    @update:visible="close"
  >
    <form
      class="form"
      @submit.prevent="submit"
    >
      <label class="form__field">
        <span>{{ isMaterial ? 'Материал' : 'Инструмент' }}</span>
        <CreatableSelect
          v-model="ownerId"
          :options="ownerOptions"
          :loading="loadingOptions"
          placeholder="Выберите или начните вводить"
          fluid
          @create="startDraft"
        />
      </label>

      <!-- Новая позиция не заводится сразу: словарь создаёт её вместе со сборкой одной
           транзакцией — иначе у неё появилась бы лишняя служебная сборка без параметров. -->
      <fieldset
        v-if="draft"
        class="form__draft"
      >
        <legend>Новый {{ isMaterial ? 'материал' : 'инструмент' }} — заведётся вместе со сборкой</legend>
        <label class="form__field">
          <span>Название</span>
          <InputText
            v-model="draft.name"
            fluid
          />
        </label>
        <div
          v-if="isMaterial"
          class="form__row"
        >
          <label class="form__field">
            <span>Единица расхода</span>
            <CreatableSelect
              v-model="draft.unitId"
              :options="units"
              placeholder="Единица"
              fluid
              @create="(name) => quickCreate('unit', name, (id) => draft && (draft.unitId = id))"
            />
          </label>
          <label class="form__field">
            <span>Тип (необязательно)</span>
            <Select
              v-model="draft.typeId"
              :options="types"
              option-label="label"
              option-value="id"
              placeholder="Без типа"
              show-clear
              filter
              fluid
            />
          </label>
        </div>
      </fieldset>

      <div class="form__params">
        <div class="form__params-head">
          <span>Параметры</span>
          <small>пусто — служебная сборка без параметров (код = id позиции)</small>
        </div>
        <div
          v-for="(param, index) in params"
          :key="index"
          class="form__param"
        >
          <CreatableSelect
            v-model="param.kindId"
            :options="kindOptions"
            placeholder="Вид"
            @create="(name) => quickCreate('kind', name, (id) => (param.kindId = id))"
          />
          <InputNumber
            v-model="param.value"
            placeholder="Значение"
            :min-fraction-digits="0"
            :max-fraction-digits="4"
            :min="0"
            locale="ru-RU"
          />
          <CreatableSelect
            v-model="param.unitId"
            :options="units"
            placeholder="Единица"
            @create="(name) => quickCreate('unit', name, (id) => (param.unitId = id))"
          />
          <Button
            icon="pi pi-times"
            text
            severity="secondary"
            title="Убрать параметр"
            @click="params.splice(index, 1)"
          />
        </div>
        <Button
          label="Добавить параметр"
          icon="pi pi-plus"
          text
          size="small"
          @click="params.push({ kindId: null, unitId: null, value: null })"
        />
      </div>

      <Message
        v-if="error"
        severity="error"
        size="small"
      >
        {{ error }}
      </Message>

      <footer class="form__actions">
        <Button
          label="Отмена"
          text
          @click="close"
        />
        <Button
          type="submit"
          :label="draft ? 'Создать позицию со сборкой' : 'Добавить сборку'"
          :loading="saving"
          :disabled="!canSubmit"
        />
      </footer>
    </form>

    <QuickCreateDialog
      :target="quick?.target ?? null"
      @close="quick = null"
      @created="onQuickCreated"
    />
  </Dialog>
</template>

<script setup lang="ts">
  import Button from 'primevue/button';
  import Dialog from 'primevue/dialog';
  import InputNumber from 'primevue/inputnumber';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import Select from 'primevue/select';
  import { computed, ref, watch } from 'vue';

  import { type CreateKind, dict, type Page } from '@/api';

  import CreatableSelect, { type Option } from './CreatableSelect.vue';
  import QuickCreateDialog, { type QuickTarget } from './QuickCreateDialog.vue';

  type ParamRow = { kindId: number | null; unitId: number | null; value: number | null };
  type Named = { id: number; name: string; code?: string; isActive?: boolean };
  type Draft = { name: string; unitId: number | null; typeId: number | null };

  /** id черновика новой позиции в списке владельцев: настоящие id положительные. */
  const DRAFT_ID = -1;

  const props = defineProps<{ kind: CreateKind; visible: boolean }>();
  const emit = defineEmits<{ 'update:visible': [boolean]; created: [string] }>();

  const isMaterial = computed(() => props.kind === 'material_variant');
  // Путь владельца в API словаря: /materials или /hand-tools.
  const ownerPath = computed(() => (isMaterial.value ? '/materials' : '/hand-tools'));

  const owners = ref<Option[]>([]);
  const kinds = ref<Option[]>([]);
  const units = ref<Option[]>([]);
  const types = ref<Option[]>([]);
  const loadingOptions = ref(false);

  const ownerId = ref<number | null>(null);
  const draft = ref<Draft | null>(null);
  const params = ref<ParamRow[]>([]);
  const saving = ref(false);
  const error = ref('');

  const ownerOptions = computed<Option[]>(() =>
    draft.value ? [{ id: DRAFT_ID, label: `Новый: ${draft.value.name}` }, ...owners.value] : owners.value,
  );
  // «Без вида» — законно: у части значений вид не задан (метры у рулеток), kindId: null.
  const kindOptions = computed<Option[]>(() => [{ id: null, label: '— без вида —' }, ...kinds.value]);

  // Выбрали существующую позицию — черновик больше не нужен.
  watch(ownerId, (id) => {
    if (id !== DRAFT_ID) draft.value = null;
  });

  const canSubmit = computed(() => {
    const paramsOk = params.value.every((p) => p.unitId !== null && p.value !== null && p.value > 0);
    if (draft.value) return paramsOk && !!draft.value.name.trim() && (!isMaterial.value || draft.value.unitId !== null);
    return paramsOk && ownerId.value !== null;
  });

  const label = (item: Named, withCode = false) =>
    `${withCode && item.code ? `${item.code} — ` : ''}${item.name} #${item.id}${item.isActive === false ? ' (архив)' : ''}`;

  async function loadOptions() {
    loadingOptions.value = true;
    error.value = '';
    try {
      // limit — максимум словаря; state=all — чтобы и в архивную позицию можно было добавить.
      const [ownerPage, kindPage, unitPage, typePage] = await Promise.all([
        dict.get<Page<Named>>(`${ownerPath.value}?limit=200&state=all`),
        dict.get<Page<Named>>('/param-kinds?limit=200'),
        dict.get<Page<Named>>('/units?limit=200'),
        isMaterial.value ? dict.get<Page<Named>>('/material-types?limit=200') : Promise.resolve({ items: [] }),
      ]);
      owners.value = ownerPage.items.map((o) => ({ id: o.id, label: label(o) }));
      kinds.value = kindPage.items.map((k) => ({ id: k.id, label: label(k) }));
      units.value = unitPage.items.map((u) => ({ id: u.id, label: label(u, true) }));
      types.value = typePage.items.map((t) => ({ id: t.id, label: label(t) }));
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loadingOptions.value = false;
    }
  }

  watch(
    () => props.visible,
    (open) => {
      if (!open) return;
      ownerId.value = null;
      draft.value = null;
      params.value = [];
      error.value = '';
      void loadOptions();
    },
    { immediate: true },
  );

  function startDraft(name: string) {
    draft.value = { name, unitId: null, typeId: null };
    ownerId.value = DRAFT_ID;
  }

  /* ---------------- вид параметра и единица — заводятся сразу, это отдельные справочники */

  const QUICK: Record<'kind' | 'unit', Omit<QuickTarget, 'name'>> = {
    kind: { title: 'Новый вид параметра', path: '/param-kinds', codeHint: 'строчная латиница и _, например wall_thickness' },
    unit: { title: 'Новая единица', path: '/units', codeHint: 'строчная латиница и цифры, например m3' },
  };

  const quick = ref<{ kind: 'kind' | 'unit'; target: QuickTarget; apply: (id: number) => void } | null>(null);

  function quickCreate(kind: 'kind' | 'unit', name: string, apply: (id: number) => void) {
    quick.value = { kind, target: { ...QUICK[kind], name }, apply };
  }

  function onQuickCreated(created: { id: number; code: string; nameRu: string }) {
    if (!quick.value) return;
    const item: Named = { id: created.id, code: created.code, name: created.nameRu };
    if (quick.value.kind === 'kind') kinds.value = [...kinds.value, { id: item.id, label: label(item) }];
    else units.value = [...units.value, { id: item.id, label: label(item, true) }];
    quick.value.apply(created.id);
    quick.value = null;
  }

  /* -------------------------------------------------------------------------- сохранение */

  const paramBody = () => params.value.map((p) => ({ kindId: p.kindId, unitId: p.unitId, value: p.value }));

  async function submit() {
    if (!canSubmit.value) return;
    saving.value = true;
    error.value = '';
    try {
      emit('created', draft.value ? await createOwnerWithVariant(draft.value) : await addVariant(ownerId.value!));
      close();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      saving.value = false;
    }
  }

  async function addVariant(id: number): Promise<string> {
    const created = await dict.post<{ id: number; code: string }>(`${ownerPath.value}/${id}/variants`, {
      params: paramBody(),
    });
    return `Сборка добавлена: id ${created.id}, код ${created.code}`;
  }

  /**
   * Название пишем в nameRu — админка русская. Позицию с тем же названием словарь не
   * заведёт второй (409), а совпавшую со своей удалённой — восстановит.
   */
  async function createOwnerWithVariant(d: Draft): Promise<string> {
    const body: Record<string, unknown> = { nameRu: d.name.trim(), variants: [paramBody()] };
    if (isMaterial.value) {
      body.unitId = d.unitId;
      if (d.typeId !== null) body.typeId = d.typeId;
    }
    const owner = await dict.post<{ id: number }>(ownerPath.value, body);
    // Код сборки считает словарь, в ответе на создание позиции его нет — дочитываем.
    const variants = await dict.get<{ id: number; code: string }[]>(`${ownerPath.value}/${owner.id}/variants`);
    const codes = variants.map((v) => v.code).join(', ');
    return `${isMaterial.value ? 'Материал' : 'Инструмент'} «${d.name.trim()}» заведён (#${owner.id}), сборка: ${codes}`;
  }

  function close() {
    emit('update:visible', false);
  }
</script>

<style scoped>
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .form__row {
    display: flex;
    gap: 12px;
  }

  .form__draft {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 12px;
    border: 1px dashed var(--p-content-border-color);
    border-radius: 8px;
  }

  .form__draft legend {
    padding: 0 6px;
    color: var(--p-text-muted-color);
    font-size: 13px;
  }

  .form__params {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form__params-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .form__params-head small {
    color: var(--p-text-muted-color);
  }

  .form__param {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1.2fr auto;
    gap: 8px;
  }

  .form__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>

<template>
  <div class="table-page">
    <header class="bar">
      <div class="bar__title">
        <h3>{{ data?.title ?? table }}</h3>
        <span
          v-if="data"
          class="bar__meta"
        >
          {{ data.db }} · {{ data.from }} · {{ shown === data.rows.length ? shown : `${shown} из ${data.rows.length}` }}
          строк
        </span>
      </div>
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="quickFilter"
          placeholder="Поиск по всем колонкам"
          size="small"
        />
      </IconField>
      <MultiSelect
        v-model="visible"
        :options="allFields"
        placeholder="Колонки"
        :max-selected-labels="0"
        selected-items-label="Колонки: {0}"
        size="small"
        filter
        @update:model-value="applyVisibility"
      />
      <Button
        v-if="data?.create"
        label="Добавить сборку"
        icon="pi pi-plus"
        size="small"
        @click="creating = true"
      />
      <Button
        icon="pi pi-filter-slash"
        text
        size="small"
        title="Сбросить фильтры и раскладку колонок"
        @click="resetLayout"
      />
      <Button
        icon="pi pi-refresh"
        text
        size="small"
        title="Перечитать"
        :loading="loading"
        @click="load"
      />
    </header>

    <Message
      v-if="error"
      severity="error"
      class="table-page__note"
    >
      {{ error }}
    </Message>
    <Message
      v-if="notice"
      severity="success"
      class="table-page__note"
      closable
      @close="notice = ''"
    >
      {{ notice }}
    </Message>
    <Message
      v-if="data?.truncated"
      severity="warn"
      class="table-page__note"
    >
      Показаны первые {{ data.limit }} строк — дальше админка пока не грузит.
    </Message>

    <AgGridVue
      class="table-page__grid"
      :theme="theme"
      :row-data="data?.rows"
      :column-defs="columns"
      :default-col-def="defaultColDef"
      :quick-filter-text="quickFilter"
      :row-class-rules="rowClassRules"
      :loading="loading"
      :enable-cell-text-selection="true"
      :tooltip-show-delay="400"
      @grid-ready="onGridReady"
      @first-data-rendered="restoreLayout"
      @model-updated="countShown"
      @column-moved="saveLayout"
      @column-resized="onResized"
      @column-pinned="saveLayout"
      @sort-changed="saveLayout"
      @cell-double-clicked="openCell"
    />

    <VariantCreateDialog
      v-if="data?.create"
      v-model:visible="creating"
      :kind="data.create"
      @created="onCreated"
    />

    <Dialog
      v-model:visible="cell.open"
      :header="cell.title"
      modal
      maximizable
      :style="{ width: '720px' }"
    >
      <pre class="cell-dialog">{{ cell.text }}</pre>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
  import {
    type CellDoubleClickedEvent,
    type ColDef,
    type ColumnResizedEvent,
    colorSchemeDark,
    type GridApi,
    type GridReadyEvent,
    themeQuartz,
  } from 'ag-grid-community';
  import { AgGridVue } from 'ag-grid-vue3';
  import Button from 'primevue/button';
  import Dialog from 'primevue/dialog';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import MultiSelect from 'primevue/multiselect';
  import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';

  import { api, type Row, type TableData } from '@/api';
  import { columnDefs } from '@/columns';
  import VariantCreateDialog from '@/forms/VariantCreateDialog.vue';

  const props = defineProps<{ table: string }>();

  const data = shallowRef<TableData>();
  const loading = ref(false);
  const error = ref('');
  const quickFilter = ref('');
  const shown = ref(0);
  const visible = ref<string[]>([]);
  const cell = reactive({ open: false, title: '', text: '' });
  const creating = ref(false);
  const notice = ref('');

  let grid: GridApi<Row> | undefined;

  const columns = computed<ColDef<Row>[]>(() => (data.value ? columnDefs(data.value.columns) : []));
  const allFields = computed(() => data.value?.columns.map((c) => c.field) ?? []);

  const defaultColDef: ColDef<Row> = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    minWidth: 80,
    width: 160,
  };

  const rowClassRules = { 'row-archived': (p: { data?: Row }) => p.data?.is_active === false };

  // Тема таблицы — вслед за системной, как у PrimeVue.
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = ref(dark.matches);
  const onScheme = (e: MediaQueryListEvent) => (isDark.value = e.matches);
  onMounted(() => dark.addEventListener('change', onScheme));
  onBeforeUnmount(() => dark.removeEventListener('change', onScheme));
  const theme = computed(() =>
    (isDark.value ? themeQuartz.withPart(colorSchemeDark) : themeQuartz).withParams({
      fontSize: 13,
      spacing: 6,
    }),
  );

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      // Видимые колонки не трогаем: их по первой отрисовке ставит restoreLayout, а перечитывание
      // после добавления сборки не должно сбрасывать скрытые.
      data.value = await api.table(props.table);
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  // Текст собирает форма: код считает словарь, и видно, что именно завелось.
  async function onCreated(message: string) {
    notice.value = message;
    await load();
  }

  function onGridReady(event: GridReadyEvent<Row>) {
    grid = event.api;
  }

  function countShown() {
    shown.value = grid?.getDisplayedRowCount() ?? 0;
  }

  /* ---------- раскладка колонок: ширины, порядок, скрытые, сортировка — на таблицу */

  const layoutKey = () => `admin.layout.${props.table}`;

  function saveLayout() {
    if (!grid) return;
    try {
      localStorage.setItem(layoutKey(), JSON.stringify(grid.getColumnState()));
    } catch {
      // без хранилища раскладка просто не запомнится
    }
  }

  // Ширину пишем по отпусканию мыши, а не на каждый пиксель перетаскивания.
  function onResized(event: ColumnResizedEvent<Row>) {
    if (event.finished) saveLayout();
  }

  function restoreLayout() {
    if (!grid) return;
    try {
      const saved = localStorage.getItem(layoutKey());
      // applyOrder: порядок колонок тоже из сохранённого; новые колонки из миграции встанут в конец.
      if (saved) grid.applyColumnState({ state: JSON.parse(saved), applyOrder: true });
    } catch {
      // битая запись — остаёмся с раскладкой по умолчанию
    }
    visible.value = grid
      .getColumnState()
      .filter((c) => !c.hide)
      .map((c) => c.colId);
    countShown();
  }

  function applyVisibility(fields: string[]) {
    if (!grid) return;
    const keep = new Set(fields);
    grid.applyColumnState({ state: allFields.value.map((colId) => ({ colId, hide: !keep.has(colId) })) });
    saveLayout();
  }

  function resetLayout() {
    try {
      localStorage.removeItem(layoutKey());
    } catch {
      // нечего удалять
    }
    quickFilter.value = '';
    grid?.setFilterModel(null);
    grid?.resetColumnState();
    visible.value = allFields.value;
  }

  /** Двойной клик — значение целиком: JSON заявки, длинное описание. */
  function openCell(event: CellDoubleClickedEvent<Row>) {
    const field = event.colDef.field;
    if (!field || !event.data) return;
    const raw = event.data[field];
    const label = event.data.$labels?.[field];
    cell.title = `${field} · строка ${String(event.data.id ?? event.rowIndex)}`;
    cell.text =
      label !== undefined
        ? `${label ?? '⚠ ссылки нет в базе'}\n\n${String(raw)}`
        : typeof raw === 'object' && raw !== null
          ? JSON.stringify(raw, null, 2)
          : String(raw ?? '');
    cell.open = true;
  }

  void load();
</script>

<style scoped>
  .table-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--p-content-border-color);
  }

  .bar__title {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .bar__title h3 {
    margin: 0;
    white-space: nowrap;
  }

  .bar__meta {
    color: var(--p-text-muted-color);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .table-page__note {
    margin: 8px 12px 0;
  }

  .table-page__grid {
    flex: 1;
    min-height: 0;
  }

  .cell-dialog {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
  }
</style>

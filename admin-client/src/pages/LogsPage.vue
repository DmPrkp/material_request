<template>
  <div class="logs">
    <header class="bar">
      <div class="bar__title">
        <h3>Лог ошибок</h3>
        <span
          v-if="data"
          class="bar__meta"
          :title="data.dir"
        >
          {{ shown }} из {{ data.total }} · файлов {{ data.files.length }}
          <template v-if="updatedAt">· обновлено {{ updatedAt }}</template>
        </span>
      </div>
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="prefs.query"
          placeholder="Поиск по тексту и стеку"
          size="small"
        />
      </IconField>
      <MultiSelect
        v-model="prefs.services"
        :options="services"
        placeholder="Все сервисы"
        :max-selected-labels="1"
        selected-items-label="Сервисов: {0}"
        size="small"
        show-clear
      />
      <SelectButton
        v-model="prefs.period"
        :options="PERIODS"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
      />
      <label class="bar__toggle">
        <ToggleSwitch v-model="prefs.grouped" />
        одинаковые вместе
      </label>
      <label class="bar__toggle">
        <ToggleSwitch v-model="prefs.auto" />
        каждые 10 с
      </label>
      <Button
        icon="pi pi-file"
        text
        size="small"
        title="Файлы лога"
        :disabled="!data?.files.length"
        @click="filesMenu?.toggle($event)"
      />
      <Menu
        ref="filesMenu"
        :model="fileItems"
        popup
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
      class="logs__note"
    >
      {{ error }}
    </Message>
    <Message
      v-else-if="data && !data.files.length"
      severity="success"
      class="logs__note"
    >
      Ошибок нет: файлы в {{ data.dir }} появляются с первой записью.
    </Message>
    <Message
      v-if="data && data.total > data.limit"
      severity="warn"
      class="logs__note"
    >
      Показаны последние {{ data.limit }} записей из {{ data.total }} — остальное в файлах (кнопка справа вверху).
    </Message>

    <div class="logs__body">
      <AgGridVue
        class="logs__grid"
        :theme="theme"
        :row-data="rows"
        :column-defs="columns"
        :default-col-def="defaultColDef"
        :quick-filter-text="prefs.query"
        :get-row-id="(p: { data: LogRow }) => p.data.id"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :loading="loading && !data"
        :tooltip-show-delay="400"
        @grid-ready="onGridReady"
        @model-updated="countShown"
        @row-clicked="(e: RowClickedEvent<LogRow>) => (selected = e.data ?? null)"
      />

      <aside
        v-if="selected"
        class="detail"
      >
        <header class="detail__head">
          <Tag
            :value="selected.level"
            :severity="severity(selected.level)"
          />
          <strong>{{ selected.service }}</strong>
          <span>{{ formatAt(selected.at) }} · {{ ago(selected.at) }}</span>
          <span class="detail__spacer" />
          <Button
            icon="pi pi-copy"
            text
            size="small"
            :label="copied ? 'Скопировано' : 'Скопировать'"
            @click="copy"
          />
          <Button
            icon="pi pi-times"
            text
            size="small"
            title="Закрыть"
            @click="selected = null"
          />
        </header>
        <p
          v-if="selected.count > 1"
          class="detail__repeat"
        >
          Повторялась {{ selected.count }} раз: впервые {{ formatAt(selected.firstAt) }} ({{ ago(selected.firstAt) }}),
          последний раз {{ formatAt(selected.at) }}. Ниже — последняя.
        </p>
        <p class="detail__where">
          <code>{{ selected.context }}</code>
          <span class="detail__file">{{ selected.file }}:{{ selected.line }}</span>
        </p>
        <pre class="detail__message">{{ selected.message }}</pre>
        <pre
          v-if="selected.stack"
          class="detail__stack"
          >{{ selected.stack }}</pre
        >
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { ColDef, GridApi, GridReadyEvent, RowClickedEvent } from 'ag-grid-community';
  import { AgGridVue } from 'ag-grid-vue3';
  import Button from 'primevue/button';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';
  import InputText from 'primevue/inputtext';
  import Menu from 'primevue/menu';
  import Message from 'primevue/message';
  import MultiSelect from 'primevue/multiselect';
  import SelectButton from 'primevue/selectbutton';
  import Tag from 'primevue/tag';
  import ToggleSwitch from 'primevue/toggleswitch';
  import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue';

  import { api, type LogsData } from '@/api';
  import { useGridTheme } from '@/gridTheme';
  import { ago, asRows, entryText, formatAt, formatSize, grouped, type LogRow } from '@/logs';

  const PERIODS = [
    { label: '1 ч', value: 3600 },
    { label: '24 ч', value: 86400 },
    { label: '7 дн', value: 7 * 86400 },
    { label: 'всё', value: 0 },
  ];
  const AUTO_MS = 10_000;
  const PREFS_KEY = 'admin.logs.prefs';

  type Prefs = { query: string; services: string[]; period: number; grouped: boolean; auto: boolean };

  function readPrefs(): Prefs {
    const defaults: Prefs = { query: '', services: [], period: 0, grouped: false, auto: false };
    try {
      return { ...defaults, ...(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>) };
    } catch {
      return defaults;
    }
  }

  // Фильтры и режимы помнятся между заходами — открыл лог, и видно то же, что в прошлый раз.
  const prefs = reactive<Prefs>(readPrefs());
  watch(prefs, () => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // без хранилища просто не запомнится
    }
  });

  const data = shallowRef<LogsData>();
  const loading = ref(false);
  const error = ref('');
  const updatedAt = ref('');
  const shown = ref(0);
  const selected = ref<LogRow | null>(null);
  const copied = ref(false);
  const filesMenu = ref<InstanceType<typeof Menu>>();
  const theme = useGridTheme();
  let grid: GridApi<LogRow> | undefined;

  const services = computed(() => [...new Set(data.value?.files.map((f) => f.service) ?? [])].sort());

  /** Сервис и период — до таблицы: от них зависит группировка (счёт повторов за период). */
  const rows = computed<LogRow[]>(() => {
    const entries = data.value?.entries ?? [];
    const since = prefs.period ? new Date(Date.now() - prefs.period * 1000).toISOString() : '';
    const picked = entries.filter(
      (e) => (!prefs.services.length || prefs.services.includes(e.service)) && (!since || e.at >= since),
    );
    return prefs.grouped ? grouped(picked) : asRows(picked);
  });

  const severity = (level: string) =>
    ['error', 'crit', 'alert', 'emerg'].includes(level) ? 'danger' : level === 'warn' ? 'warn' : 'secondary';

  const defaultColDef: ColDef<LogRow> = { sortable: true, resizable: true, filter: true, cellDataType: false };

  const columns = computed<ColDef<LogRow>[]>(() => [
    {
      field: 'at',
      headerName: prefs.grouped ? 'последний раз' : 'время',
      // Новые сверху — порядок по умолчанию; щелчок по заголовку переворачивает.
      sort: 'desc',
      width: 190,
      valueFormatter: (p) => (p.value ? formatAt(p.value as string) : ''),
      tooltipValueGetter: (p) => (p.value ? ago(p.value as string) : ''),
      filter: false,
    },
    ...(prefs.grouped
      ? [
          { field: 'count' as const, headerName: 'раз', width: 80, type: 'rightAligned', filter: 'agNumberColumnFilter' },
          {
            field: 'firstAt' as const,
            headerName: 'впервые',
            width: 170,
            valueFormatter: (p: { value: unknown }) => (p.value ? formatAt(p.value as string) : ''),
            filter: false,
          },
        ]
      : []),
    { field: 'service', headerName: 'сервис', width: 150 },
    { field: 'level', headerName: 'уровень', width: 100, cellClass: (p) => `level-${String(p.value)}` },
    { field: 'context', headerName: 'где', width: 280, tooltipField: 'context' },
    {
      field: 'message',
      headerName: 'сообщение',
      flex: 1,
      minWidth: 300,
      tooltipField: 'message',
      valueFormatter: (p) => String(p.value ?? '').split('\n')[0],
    },
    // Стек не показываем колонкой, но ищем по нему: быстрый поиск идёт по значениям колонок.
    { field: 'stack', hide: true },
  ]);

  const fileItems = computed(() =>
    (data.value?.files ?? []).map((file) => ({
      label: `${file.name} · ${formatSize(file.size)} · ${ago(file.modifiedAt)}`,
      icon: 'pi pi-download',
      command: () => void download(file.name),
    })),
  );

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      data.value = await api.logs();
      updatedAt.value = new Intl.DateTimeFormat('ru-RU', { timeStyle: 'medium' }).format(new Date());
      // Выбранная запись после перечитывания — та же по id, если ещё есть (при группировке — по ключу).
      if (selected.value) selected.value = rows.value.find((r) => r.id === selected.value?.id) ?? selected.value;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  function onGridReady(event: GridReadyEvent<LogRow>) {
    grid = event.api;
  }

  function countShown() {
    shown.value = grid?.getDisplayedRowCount() ?? 0;
  }

  async function download(name: string) {
    try {
      const text = await api.logFile(name);
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: name });
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      error.value = (e as Error).message;
    }
  }

  async function copy() {
    if (!selected.value) return;
    await navigator.clipboard.writeText(entryText(selected.value));
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  }

  // Автообновление — только пока вкладка видна: фоновая вкладка незачем дёргает сервер.
  let timer: ReturnType<typeof setInterval> | undefined;
  watch(
    () => prefs.auto,
    (on) => {
      clearInterval(timer);
      if (on) timer = setInterval(() => document.visibilityState === 'visible' && void load(), AUTO_MS);
    },
    { immediate: true },
  );
  onBeforeUnmount(() => clearInterval(timer));

  void load();
</script>

<style scoped>
  .logs {
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
    flex-wrap: wrap;
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
  }

  .bar__toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    white-space: nowrap;
  }

  .logs__note {
    margin: 8px 12px 0;
  }

  .logs__body {
    flex: 1;
    min-height: 0;
    display: flex;
  }

  .logs__grid {
    flex: 1;
    min-width: 0;
  }

  .detail {
    flex: 0 0 44%;
    min-width: 0;
    overflow: auto;
    border-left: 1px solid var(--p-content-border-color);
    padding: 8px 12px 16px;
  }

  .detail__head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .detail__spacer {
    flex: 1;
  }

  .detail__repeat {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--p-text-muted-color);
  }

  .detail__where {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: 10px 0 6px;
  }

  .detail__file {
    color: var(--p-text-muted-color);
    font-size: 12px;
    white-space: nowrap;
  }

  .detail__message,
  .detail__stack {
    margin: 0 0 10px;
    padding: 8px 10px;
    border-radius: 6px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    background: var(--p-content-hover-background);
  }

  .detail__message {
    font-size: 13px;
  }

  :deep(.level-error),
  :deep(.level-crit),
  :deep(.level-alert),
  :deep(.level-emerg) {
    color: var(--p-red-500);
  }

  :deep(.level-warn) {
    color: var(--p-orange-500);
  }
</style>

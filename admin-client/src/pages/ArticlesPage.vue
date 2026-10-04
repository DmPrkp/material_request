<template>
  <div class="articles">
    <header class="bar">
      <h3>Тексты технологий</h3>
      <span class="bar__meta">
        под калькулятором и в HTML страницы для поисковиков · «## » в начале строки — заголовок, пустая строка —
        новый абзац
      </span>
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
      class="articles__note"
      closable
      @close="error = ''"
    >
      {{ error }}
    </Message>

    <div class="articles__body">
      <div class="articles__head">
        <Select
          v-model="selectedId"
          :options="systemOptions"
          option-label="label"
          option-value="id"
          placeholder="Технология"
          filter
          class="articles__select"
          @change="open"
        />
        <span
          v-if="saved"
          class="articles__saved"
        >
          <i class="pi pi-check" /> сохранено
        </span>
        <Button
          label="Сохранить"
          icon="pi pi-save"
          size="small"
          :loading="saving"
          :disabled="!selectedId || !dirty"
          @click="save"
        />
      </div>

      <div
        v-if="selectedId"
        class="articles__fields"
      >
        <label
          v-for="field in FIELDS"
          :key="field.key"
          class="articles__field"
        >
          <span>
            {{ field.label }}
            <small>{{ form[field.key].length }} / {{ MAX }}</small>
          </span>
          <Textarea
            v-model="form[field.key]"
            :maxlength="MAX"
            :disabled="opening"
            spellcheck="true"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import Button from 'primevue/button';
  import Message from 'primevue/message';
  import Select from 'primevue/select';
  import Textarea from 'primevue/textarea';
  import { computed, onMounted, reactive, ref } from 'vue';

  import { dict, type Page } from '@/api';

  /** Как optionalText(20000) у articleRu/En в structure.dto.ts словаря. */
  const MAX = 20000;
  const FIELDS = [
    { key: 'articleRu', label: 'Русский' },
    { key: 'articleEn', label: 'English' },
  ] as const;
  type Field = (typeof FIELDS)[number]['key'];

  type System = { id: number; title: string; name: string; isActive?: boolean };
  type Translations = Record<Field, string | null>;

  const systems = ref<System[]>([]);
  const selectedId = ref<number | null>(null);
  const form = reactive<Record<Field, string>>({ articleRu: '', articleEn: '' });
  // Что лежит в словаре сейчас — с ним сравниваем форму, чтобы не сохранять без правок.
  const original = reactive<Record<Field, string>>({ articleRu: '', articleEn: '' });
  const loading = ref(false);
  const opening = ref(false);
  const saving = ref(false);
  const saved = ref(false);
  const error = ref('');

  const systemOptions = computed(() =>
    systems.value.map((s) => ({ id: s.id, label: `${s.name} · ${s.title}${s.isActive === false ? ' (архив)' : ''}` })),
  );
  const dirty = computed(() => FIELDS.some(({ key }) => form[key] !== original[key]));

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      systems.value = (await dict.get<Page<System>>('/systems?limit=200&state=all')).items;
      if (selectedId.value) await open();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function open() {
    if (!selectedId.value) return;
    opening.value = true;
    saved.value = false;
    error.value = '';
    try {
      // translations=all — оба языка как есть: без него словарь сводит пару в одно поле.
      const system = await dict.get<Translations>(`/systems/${selectedId.value}?translations=all`);
      for (const { key } of FIELDS) original[key] = form[key] = system[key] ?? '';
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      opening.value = false;
    }
  }

  async function save() {
    if (!selectedId.value) return;
    saving.value = true;
    error.value = '';
    try {
      // Пустое поле — null: словарь (localize) тогда покажет текст на другом языке, а
      // страница на этом языке не останется с пустой строкой вместо текста.
      const body = Object.fromEntries(FIELDS.map(({ key }) => [key, form[key].trim() || null]));
      // Админ правит общую технологию на месте (common/ownership.ts) — копии не будет.
      // translations=all и здесь: ответ PATCH тоже проходит через сведение языков.
      const system = await dict.patch<Translations>(`/systems/${selectedId.value}?translations=all`, body);
      for (const { key } of FIELDS) original[key] = form[key] = system[key] ?? '';
      saved.value = true;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      saving.value = false;
    }
  }

  onMounted(load);
</script>

<style scoped>
  .articles {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .bar {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--p-content-border-color);
  }

  .bar h3 {
    margin: 0;
  }

  .bar__meta {
    flex: 1;
    color: var(--p-text-muted-color);
    font-size: 12px;
  }

  .articles__note {
    margin: 8px 12px 0;
  }

  .articles__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    min-height: 0;
  }

  .articles__head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .articles__select {
    width: 420px;
  }

  .articles__saved {
    margin-left: auto;
    color: var(--p-green-500);
    font-size: 13px;
  }

  .articles__fields {
    display: grid;
    flex: 1;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    min-height: 0;
  }

  .articles__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
  }

  .articles__field > span {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
  }

  .articles__field small {
    color: var(--p-text-muted-color);
    font-weight: normal;
  }

  .articles__field textarea {
    flex: 1;
    min-height: 300px;
    resize: none;
    font-family: inherit;
    line-height: 1.5;
  }
</style>

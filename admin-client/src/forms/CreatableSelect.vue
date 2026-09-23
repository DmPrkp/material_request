<template>
  <Select
    ref="select"
    :model-value="modelValue"
    :options="options"
    option-label="label"
    option-value="id"
    :placeholder="placeholder"
    :loading="loading"
    filter
    :fluid="fluid"
    reset-filter-on-hide
    @update:model-value="emit('update:modelValue', $event)"
    @filter="query = $event.value"
    @hide="query = ''"
  >
    <!-- Кнопка и при частичном совпадении: «уголок» найдёт «Уголок перфорированный», а нужен другой. -->
    <template #footer>
      <div
        v-if="query.trim()"
        class="creatable__footer"
      >
        <Button
          :label="`Создать «${query.trim()}»`"
          icon="pi pi-plus"
          text
          size="small"
          @click="create"
        />
      </div>
    </template>
  </Select>
</template>

<script setup lang="ts">
  import Button from 'primevue/button';
  import Select from 'primevue/select';
  import { ref } from 'vue';

  export type Option = { id: number | null; label: string };

  defineProps<{
    modelValue: number | null;
    options: Option[];
    placeholder?: string;
    loading?: boolean;
    fluid?: boolean;
  }>();
  const emit = defineEmits<{ 'update:modelValue': [number | null]; create: [string] }>();

  const select = ref<{ hide: () => void }>();
  const query = ref('');

  function create() {
    const text = query.value.trim();
    select.value?.hide();
    query.value = '';
    emit('create', text);
  }
</script>

<style scoped>
  .creatable__footer {
    padding: 4px 8px 8px;
    border-top: 1px solid var(--p-content-border-color);
  }
</style>

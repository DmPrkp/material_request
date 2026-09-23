<template>
  <Dialog
    :visible="!!target"
    :header="target?.title"
    modal
    :style="{ width: '420px' }"
    @update:visible="emit('close')"
  >
    <form
      class="quick"
      @submit.prevent="submit"
    >
      <label>
        <span>Код</span>
        <InputText
          v-model="code"
          :placeholder="target?.codeHint"
          fluid
        />
        <small>{{ target?.codeHint }}</small>
      </label>
      <label>
        <span>Название по-русски</span>
        <InputText
          v-model="nameRu"
          fluid
        />
      </label>
      <label>
        <span>Название по-английски</span>
        <InputText
          v-model="nameEn"
          fluid
        />
      </label>
      <Message
        v-if="error"
        severity="error"
        size="small"
      >
        {{ error }}
      </Message>
      <footer>
        <Button
          label="Отмена"
          text
          @click="emit('close')"
        />
        <Button
          type="submit"
          label="Создать"
          :loading="saving"
          :disabled="!code.trim() || !nameRu.trim() || !nameEn.trim()"
        />
      </footer>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
  import Button from 'primevue/button';
  import Dialog from 'primevue/dialog';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import { ref, watch } from 'vue';

  import { dict } from '@/api';

  /**
   * Мелкий справочник с кодом и двумя названиями — вид параметра, единица. У обоих в
   * базе оба названия NOT NULL, поэтому и форма требует оба (в отличие от позиций каталога).
   */
  export type QuickTarget = { title: string; path: string; codeHint: string; name: string };

  const props = defineProps<{ target: QuickTarget | null }>();
  const emit = defineEmits<{ close: []; created: [{ id: number; code: string; nameRu: string }] }>();

  const code = ref('');
  const nameRu = ref('');
  const nameEn = ref('');
  const saving = ref(false);
  const error = ref('');

  watch(
    () => props.target,
    (target) => {
      if (!target) return;
      code.value = '';
      nameRu.value = target.name;
      nameEn.value = '';
      error.value = '';
    },
  );

  async function submit() {
    if (!props.target) return;
    saving.value = true;
    error.value = '';
    try {
      const body = { code: code.value.trim(), nameRu: nameRu.value.trim(), nameEn: nameEn.value.trim() };
      const created = await dict.post<{ id: number }>(props.target.path, body);
      emit('created', { id: created.id, code: body.code, nameRu: body.nameRu });
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      saving.value = false;
    }
  }
</script>

<style scoped>
  .quick {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .quick label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .quick small {
    color: var(--p-text-muted-color);
  }

  .quick footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>

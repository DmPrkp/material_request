<template>
  <div class="feedback">
    <header class="bar">
      <div class="bar__title">
        <h3>Обращения</h3>
        <span
          v-if="data"
          class="bar__meta"
        >
          {{ shown.length }} из {{ data.total }}
          <template v-if="data.total > data.limit">· показываем последние {{ data.limit }}</template>
        </span>
      </div>

      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="query"
          placeholder="Поиск по тексту и автору"
          size="small"
        />
      </IconField>

      <SelectButton
        v-model="topic"
        :options="TOPICS"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
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

    <p
      v-if="error"
      class="feedback__error"
    >
      {{ error }}
    </p>

    <p
      v-else-if="data && !shown.length"
      class="feedback__empty"
    >
      {{ data.total ? "Ничего не нашлось." : "Обращений пока нет." }}
    </p>

    <ul class="list">
      <li
        v-for="item in shown"
        :key="item.id"
        class="card"
      >
        <div class="card__head">
          <span
            class="tag"
            :class="`tag--${item.topic}`"
          >
            {{ item.topic === "bug" ? "Ошибка" : "Улучшение" }}
          </span>

          <!-- Как ссылка в табличном просмотрщике: подпись и id рядом. Адреса у строки
               таблицы нет, поэтому ведём в «Пользователей», а искать там по id. -->
          <RouterLink
            class="card__who"
            :to="{ name: 'table', params: { table: 'user.users' } }"
            :title="`Пользователь ${item.user.id}`"
          >
            {{ item.user.name || item.user.login }}
            <span class="card__login">{{ item.user.login }} · {{ item.user.id }}</span>
          </RouterLink>

          <!-- Почта необязательна: без неё ответить некуда, и это видно сразу. -->
          <a
            v-if="item.user.email"
            class="card__mail"
            :href="`mailto:${item.user.email}?subject=${mailSubject(item)}`"
            :title="item.user.emailVerified ? 'Написать' : 'Адрес не подтверждён — письмо может не дойти'"
          >
            <i class="pi pi-envelope" />
            {{ item.user.email }}
            <template v-if="!item.user.emailVerified">⚠</template>
          </a>
          <span
            v-else
            class="card__nomail"
            >почты нет</span
          >

          <time class="card__date">{{ formatted(item.createdAt) }}</time>
        </div>

        <p class="card__text">{{ item.message }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  /**
   * Обращения из приложения. Только чтение: отвечаем почтой по ссылке у автора —
   * переписки в приложении нет и заводить её ради нескольких писем незачем.
   */
  import Button from 'primevue/button';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';
  import InputText from 'primevue/inputtext';
  import SelectButton from 'primevue/selectbutton';
  import { computed, onMounted, ref } from 'vue';

  import { api, type FeedbackData, type FeedbackEntry } from '@/api';

  const TOPICS = [
    { label: 'Все', value: 'all' },
    { label: 'Ошибки', value: 'bug' },
    { label: 'Улучшения', value: 'idea' },
  ];

  const data = ref<FeedbackData>();
  const loading = ref(false);
  const error = ref('');
  const query = ref('');
  const topic = ref<'all' | 'bug' | 'idea'>('all');

  const shown = computed(() => {
    const q = query.value.trim().toLowerCase();
    return (data.value?.items ?? []).filter((item) => {
      if (topic.value !== 'all' && item.topic !== topic.value) return false;
      if (!q) return true;
      return `${item.message} ${item.user.name} ${item.user.login} ${item.user.email ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  });

  function formatted(iso: string): string {
    return new Date(iso).toLocaleString('ru');
  }

  /** Тема письма — чтобы ответ не потерялся среди прочего. */
  function mailSubject(item: FeedbackEntry): string {
    return encodeURIComponent(`zayavka.app — ваше обращение №${item.id}`);
  }

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      data.value = await api.feedback();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
</script>

<style scoped>
  .feedback {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--p-content-border-color);
    flex-wrap: wrap;
  }

  .bar__title h3 {
    margin: 0;
  }

  .bar__meta {
    font-size: 12px;
    color: var(--p-text-muted-color);
  }

  .feedback__error {
    color: var(--p-red-500);
    padding: 16px;
  }

  .feedback__empty {
    color: var(--p-text-muted-color);
    padding: 24px 16px;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 12px 16px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .card {
    border: 1px solid var(--p-content-border-color);
    border-radius: 8px;
    padding: 10px 12px;
    max-width: 900px;
  }

  .card__head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 13px;
  }

  .card__who {
    font-weight: 600;
    color: inherit;
    text-decoration: none;
  }

  .card__who:hover {
    text-decoration: underline;
  }

  .card__login,
  .card__date,
  .card__nomail {
    font-weight: 400;
    color: var(--p-text-muted-color);
  }

  .card__date {
    margin-left: auto;
  }

  .card__mail {
    color: inherit;
  }

  .card__mail i {
    font-size: 11px;
    margin-right: 2px;
  }

  /* Текст как написали: переносы строк в обращении обычно и есть структура. */
  .card__text {
    margin: 8px 0 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .tag {
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .tag--bug {
    background: var(--p-red-100);
    color: var(--p-red-700);
  }

  .tag--idea {
    background: var(--p-blue-100);
    color: var(--p-blue-700);
  }

  @media (prefers-color-scheme: dark) {
    .tag--bug {
      background: color-mix(in srgb, var(--p-red-500) 25%, transparent);
      color: var(--p-red-300);
    }

    .tag--idea {
      background: color-mix(in srgb, var(--p-blue-500) 25%, transparent);
      color: var(--p-blue-300);
    }
  }
</style>

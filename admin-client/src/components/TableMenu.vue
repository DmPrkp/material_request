<template>
  <aside class="menu">
    <div class="menu__head">
      <strong>matli admin</strong>
      <InputText
        v-model="query"
        placeholder="Найти таблицу"
        size="small"
        fluid
      />
    </div>

    <nav class="menu__list">
      <!-- Не таблицы базы, а файлы (logs/, снимки клиента) — отдельными строками над группами таблиц. -->
      <RouterLink
        :to="{ name: 'logs' }"
        class="menu__item menu__item--logs"
        active-class="menu__item--active"
      >
        <span><i class="pi pi-exclamation-triangle" /> Лог ошибок</span>
      </RouterLink>
      <RouterLink
        :to="{ name: 'images' }"
        class="menu__item menu__item--logs"
        active-class="menu__item--active"
      >
        <span><i class="pi pi-image" /> Фото технологий</span>
      </RouterLink>
      <RouterLink
        :to="{ name: 'articles' }"
        class="menu__item menu__item--logs"
        active-class="menu__item--active"
      >
        <span><i class="pi pi-align-left" /> Тексты технологий</span>
      </RouterLink>
      <p
        v-if="error"
        class="menu__error"
      >
        {{ error }}
      </p>
      <section
        v-for="group in groups"
        :key="group.name"
      >
        <h4 class="menu__group">{{ group.name }}</h4>
        <template
          v-for="entry in group.entries"
          :key="entry.key"
        >
          <!-- Раздел со своей страницей — рядом с таблицами своей группы, а не над ними. -->
          <RouterLink
            v-if="entry.kind === 'section'"
            :to="{ name: entry.route }"
            class="menu__item"
            active-class="menu__item--active"
          >
            <span><i :class="entry.icon" /> {{ entry.name }}</span>
          </RouterLink>
          <RouterLink
            v-else
            :to="{ name: 'table', params: { table: entry.table.key } }"
            class="menu__item"
            active-class="menu__item--active"
            :title="`${entry.table.db} · ${entry.table.from}`"
          >
            {{ entry.table.title }}
            <span class="menu__db">{{ entry.table.db }}</span>
          </RouterLink>
        </template>
      </section>
    </nav>

    <footer class="menu__foot">
      <span v-if="user">{{ user.firstName }} ({{ user.login }})</span>
      <Button
        icon="pi pi-sign-out"
        text
        size="small"
        title="Выйти"
        @click="setToken(null)"
      />
    </footer>
  </aside>
</template>

<script setup lang="ts">
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import { computed, onMounted, ref } from 'vue';

  import { type AdminUser, api, setToken, type TableInfo } from '@/api';

  /**
   * Разделы со своей страницей, которым место внутри группы таблиц: «Обращения» ищут
   * среди пользователей, а не в общем списке сверху, где лежат файловые разделы.
   */
  const SECTIONS = [
    { key: 'section:feedback', kind: 'section' as const, group: 'Пользователи', name: 'Обращения', route: 'feedback', icon: 'pi pi-comments' },
  ];

  type Entry =
    | { key: string; kind: 'table'; table: TableInfo }
    | (typeof SECTIONS)[number];

  const tables = ref<TableInfo[]>([]);
  const user = ref<AdminUser>();
  const query = ref('');
  const error = ref('');

  const groups = computed(() => {
    const q = query.value.trim().toLowerCase();
    const result: { name: string; entries: Entry[] }[] = [];
    const into = (name: string) => {
      let group = result.find((g) => g.name === name);
      if (!group) result.push((group = { name, entries: [] }));
      return group;
    };

    for (const table of tables.value) {
      const haystack = `${table.group} ${table.title} ${table.from} ${table.db}`.toLowerCase();
      if (q && !haystack.includes(q)) continue;
      into(table.group).entries.push({ key: table.key, kind: 'table', table });
    }

    // После таблиц: группа к этому моменту уже на своём месте в списке, а если поиск
    // выбросил все её таблицы — заводим её ради одного раздела.
    for (const section of SECTIONS) {
      if (q && !`${section.group} ${section.name}`.toLowerCase().includes(q)) continue;
      into(section.group).entries.push(section);
    }

    return result;
  });

  onMounted(async () => {
    try {
      [tables.value, user.value] = await Promise.all([api.tables(), api.me()]);
    } catch (e) {
      error.value = (e as Error).message;
    }
  });
</script>

<style scoped>
  .menu {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--p-content-border-color);
    background: var(--p-surface-50);
    min-height: 0;
  }

  @media (prefers-color-scheme: dark) {
    .menu {
      background: var(--p-surface-900);
    }
  }

  .menu__head {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
  }

  .menu__list {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px 12px;
  }

  .menu__group {
    margin: 14px 8px 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--p-text-muted-color);
  }

  .menu__item {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 6px;
    color: inherit;
    text-decoration: none;
  }

  .menu__item:hover {
    background: var(--p-content-hover-background);
  }

  .menu__item--active {
    background: var(--p-highlight-background);
    color: var(--p-highlight-color);
  }

  .menu__item--logs {
    margin-top: 8px;
  }

  .menu__item--logs i {
    font-size: 12px;
    margin-right: 4px;
  }

  .menu__db {
    font-size: 11px;
    color: var(--p-text-muted-color);
  }

  .menu__error {
    color: var(--p-red-500);
    padding: 8px;
  }

  .menu__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-top: 1px solid var(--p-content-border-color);
    font-size: 13px;
  }
</style>

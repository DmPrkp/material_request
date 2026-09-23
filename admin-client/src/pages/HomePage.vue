<template>
  <div class="home">
    <p>Выберите таблицу слева.</p>
    <p class="home__hint">
      Ссылки между базами показаны строкой и id; <span class="ref-dangling">⚠ нет</span> — ссылка
      висячая: в базе, куда она ведёт, такой записи нет. Бледные строки — мягко удалённые.
    </p>
  </div>
</template>

<style scoped>
  .home {
    padding: 32px;
    max-width: 640px;
  }

  .home__hint {
    color: var(--p-text-muted-color);
  }
</style>

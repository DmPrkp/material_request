<template>
  <ion-button
    class="avatar_trigger"
    fill="clear"
    shape="round"
    :aria-label="label"
    :title="label"
  >
    <ion-avatar class="avatar_circle">
      <ion-icon
        class="avatar_person"
        :icon="person"
      />
      <!--
        Значок только у гостя: он и подсказывает, что по аватару можно кликнуть,
        и заменяет собой прежний отдельный восклицательный знак в шапке.
        Вошедшему подсказка не нужна — кружок остаётся чистым.
      -->
      <span
        v-if="!authStore.isAuthenticated"
        class="avatar_badge"
      >
        <ion-icon :icon="alertSharp" />
      </span>
    </ion-avatar>
  </ion-button>
</template>

<script setup lang="ts">
  /**
   * Аватар в шапке: состояние входа и вход по клику. Настройки уехали на
   * соседнюю шестерёнку — раньше они висели здесь же, и одному кружку
   * доставались два разных смысла.
   * Клик слушает App.vue — модалки живут там, а не в шапке.
   */
  import { IonAvatar, IonIcon } from "@ionic/vue";
  import { alertSharp, person } from "ionicons/icons";
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { useAuthStore } from "@/store/auth";

  const { t } = useI18n();
  const authStore = useAuthStore();

  const label = computed(() =>
    authStore.isAuthenticated
      ? t("pages.settings.title")
      : t("pages.auth.not_authorized")
  );
</script>

<style scoped>
  .avatar_trigger {
    --padding-start: 4px;
    --padding-end: 4px;
    /*
     * У round-кнопки внутренний .button-native скруглён почти в круг и режет
     * всё по overflow: hidden — значок в углу аватара срезался по дуге.
     * Выпускаем его наружу, а ripple гасим: без обрезки он вылезал бы за круг.
     * Отклик на наведение остаётся — это фон, он и так скруглён.
     */
    --overflow: visible;
    --ripple-color: transparent;
    height: auto;
  }

  .avatar_circle {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    /* Полупрозрачный цвет текста: темнее фона в светлой теме, светлее в тёмной. */
    background: rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.12);
  }

  .avatar_person {
    font-size: 20px;
    color: var(--ion-text-color, #000);
  }

  .avatar_badge {
    position: absolute;
    right: -3px;
    bottom: -3px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--ion-color-warning);
    color: var(--ion-color-warning-contrast, #000);
    /* Кольцо цвета фона «вырезает» значок из аватара. */
    box-shadow: 0 0 0 2px var(--ion-background-color, #fff);
  }

  .avatar_badge ion-icon {
    font-size: 11px;
  }
</style>

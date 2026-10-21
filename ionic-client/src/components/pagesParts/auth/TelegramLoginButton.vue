<template>
  <div ref="host" class="tg-login" />
</template>

<script setup lang="ts">
  /**
   * Официальная кнопка Telegram Login Widget: сам скрипт рисует iframe с подписью на языке
   * `data-lang` («Войти через Telegram»), вернуть своё слово на кнопку нельзя. Результат
   * приходит глобальным колбэком, поэтому он на window и снимается при уходе компонента.
   *
   * Работает только на домене, указанном у @BotFather (`/setdomain`); на localhost кнопка
   * не покажется — это ограничение Telegram, а не поломка.
   */
  import { onBeforeUnmount, onMounted, ref } from "vue";
  import type { TelegramAuthData } from "@/types/dto/auth";

  const props = defineProps<{ locale: string }>();
  const emit = defineEmits<{ auth: [data: TelegramAuthData] }>();

  // На проде у клиента нет .env, VITE_-переменные там undefined — запасное значение в коде.
  const BOT = import.meta.env.VITE_TELEGRAM_BOT || "ZayavkaAppBot";
  const CALLBACK = "onMatliTelegramAuth";

  const host = ref<HTMLElement>();

  onMounted(() => {
    (window as unknown as Record<string, unknown>)[CALLBACK] = (
      data: TelegramAuthData,
    ) => emit("auth", data);

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.dataset.telegramLogin = BOT;
    script.dataset.size = "large";
    script.dataset.userpic = "false";
    script.dataset.lang = props.locale;
    script.dataset.onauth = `${CALLBACK}(user)`;
    host.value?.appendChild(script);
  });

  onBeforeUnmount(() => {
    delete (window as unknown as Record<string, unknown>)[CALLBACK];
  });
</script>

<style scoped>
  .tg-login {
    display: flex;
    justify-content: center;
    margin-top: 16px;
    min-height: 40px;
  }
</style>

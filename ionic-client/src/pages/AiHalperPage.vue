<template>
  <ion-page>
    <ion-content
      ref="content"
      :style="{ '--padding-bottom': `${composerHeight}px` }"
    >
      <div class="ion-padding">
        <ion-item-divider>
          <ion-title>
            <h1>{{ $t("pages.assistant.title") }}</h1>
          </ion-title>
          <ion-button
            v-if="store.history.length"
            slot="end"
            fill="clear"
            size="small"
            :disabled="store.loading"
            @click="store.reset()"
          >
            {{ $t("pages.assistant.clear") }}
          </ion-button>
        </ion-item-divider>

        <!-- Ассистент действует от имени пользователя, гостю действовать не от кого. -->
        <ion-item
          v-if="!authStore.isAuthenticated"
          class="auth-warning"
          lines="none"
          button
          @click="goToAuth"
        >
          <IonIcon slot="start" :icon="alertCircle" />
          <ion-label class="ion-text-wrap">
            {{ $t("pages.assistant.auth_required") }}
          </ion-label>
        </ion-item>

        <template v-else>
          <ion-text v-if="!store.visibleMessages.length">
            <p class="hint">{{ $t("pages.assistant.empty") }}</p>
          </ion-text>

          <!-- Текст ответа — как есть, через {{ }}: разметку от модели не рендерим. -->
          <div
            v-for="(message, index) in store.visibleMessages"
            :key="index"
            class="bubble"
            :class="message.role"
          >
            {{ message.content }}
          </div>

          <ion-card v-if="store.pending.length" class="confirm">
            <ion-card-content>
              <h3>{{ $t("pages.assistant.confirm_title") }}</h3>
              <div
                v-for="action in store.pending"
                :key="action.id"
                class="action"
              >
                <p>{{ action.summary }}</p>
                <details>
                  <summary>{{ $t("pages.assistant.details") }}</summary>
                  <pre>{{ formatArgs(action.args) }}</pre>
                </details>
              </div>
              <div class="confirm_buttons">
                <ion-button
                  :disabled="store.loading"
                  @click="store.resolve(store.pending.map((a) => a.id))"
                >
                  {{ $t("pages.assistant.confirm") }}
                </ion-button>
                <ion-button
                  fill="outline"
                  color="medium"
                  :disabled="store.loading"
                  @click="store.resolve([])"
                >
                  {{ $t("pages.assistant.reject") }}
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <div v-if="store.loading" class="bubble assistant muted">
            <ion-spinner name="dots" /> {{ $t("pages.assistant.thinking") }}
          </div>

          <ion-text v-if="voice.error.value" color="danger">
            <p class="hint">
              {{ $t(`pages.assistant.errors.${voice.error.value}`) }}
            </p>
          </ion-text>

          <ion-text v-if="store.error" color="danger">
            <p class="hint">
              {{ $t(`pages.assistant.errors.${store.error}`) }}
            </p>
          </ion-text>
        </template>
      </div>

      <!--
        Поле ввода прибито к низу ion-content (slot="fixed"), как полоса действий в списке
        заявок: история длинная, и поле внизу истории уезжало бы за экран. Нижняя
        навигация приложения остаётся под страницей — она вне роутера.
      -->
      <form
        v-if="authStore.isAuthenticated"
        ref="composer"
        slot="fixed"
        class="bulk-bar composer"
        @submit.prevent="submit"
      >
        <!-- Пока ждём подтверждения, писать нельзя: сначала решение по действию. -->
        <ion-textarea
          v-model="draft"
          :rows="1"
          :auto-grow="true"
          :disabled="Boolean(store.pending.length)"
          :placeholder="
            voice.transcribing.value
              ? $t('pages.assistant.recognizing')
              : $t('pages.assistant.placeholder')
          "
          @ionFocus="onFocus"
          @keydown.enter.exact.prevent="submit"
        />
        <ion-button
          v-if="voice.supported"
          type="button"
          shape="round"
          fill="clear"
          :color="voice.recording.value ? 'danger' : undefined"
          :aria-label="
            voice.recording.value
              ? $t('pages.assistant.stop')
              : $t('pages.assistant.mic')
          "
          :title="
            voice.recording.value
              ? $t('pages.assistant.stop')
              : $t('pages.assistant.mic')
          "
          :disabled="
            voice.transcribing.value ||
            Boolean(store.pending.length) ||
            store.loading
          "
          @click="voice.toggle"
        >
          <ion-icon
            slot="icon-only"
            :icon="voice.recording.value ? stopCircleOutline : micOutline"
          />
        </ion-button>
        <ion-button
          type="submit"
          shape="round"
          :aria-label="$t('pages.assistant.send')"
          :title="$t('pages.assistant.send')"
          :disabled="!canSend"
        >
          <ion-icon slot="icon-only" :icon="sendOutline" />
        </ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  /**
   * Чат с ИИ-помощником — страница, а не оверлей: шапка и нижняя полоса приложения
   * остаются на месте. Диалог живёт в сторе (store/assistant.ts), так что уход на
   * другую вкладку и возврат его не теряют; выход из аккаунта — сбрасывает.
   */
  import {
    IonContent,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonPage,
    IonTextarea,
    IonTitle,
  } from "@ionic/vue";
  import {
    alertCircle,
    micOutline,
    sendOutline,
    stopCircleOutline,
  } from "ionicons/icons";
  import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { useAssistantStore } from "@/store/assistant";
  import { useAuthStore } from "@/store/auth";
  import { useVoiceInput } from "@/mixins/useVoiceInput";

  const store = useAssistantStore();
  const authStore = useAuthStore();
  const router = useRouter();
  const route = useRoute();

  const draft = ref("");
  const composer = ref<HTMLFormElement | null>(null);
  // Поле растёт вместе с текстом (до 120px), а общий отступ with-bulk-bar — константа 60px:
  // последняя реплика уезжала бы под многострочное поле. Отступ следует за его высотой.
  const composerHeight = ref(0);
  let composerObserver: ResizeObserver | undefined;
  watch(composer, (form) => {
    composerObserver?.disconnect();
    composerHeight.value = 0;
    if (!form || typeof ResizeObserver === "undefined") return;
    composerObserver = new ResizeObserver(() => {
      composerHeight.value = form.offsetHeight + 8;
    });
    composerObserver.observe(form);
  });
  onBeforeUnmount(() => composerObserver?.disconnect());
  const content = ref<{
    $el: { scrollToBottom: (duration?: number) => Promise<void> };
  } | null>(null);

  const canSend = computed(
    () =>
      Boolean(draft.value.trim()) &&
      !store.loading &&
      !store.pending.length &&
      !voice.busy.value,
  );

  const { locale } = useI18n();
  // Распознанное дописываем к набранному: человек мог начать печатать и продолжить голосом.
  const voice = useVoiceInput(
    () => (locale.value === "en" ? "en" : "ru"),
    (text) => {
      draft.value = draft.value ? `${draft.value} ${text}` : text;
    },
  );

  async function submit() {
    if (!canSend.value) return;
    const text = draft.value;
    draft.value = "";
    // Не дошло до сервера — вернём набранное, чтобы не писать заново.
    if (!(await store.send(text))) draft.value = text;
  }

  /**
   * Клавиатура на телефоне отъедает пол-экрана: после того как вьюпорт сжался (meta
   * interactive-widget=resizes-content в index.html), прокручиваем историю к последней реплике,
   * иначе она остаётся под полем ввода.
   */
  function onFocus() {
    setTimeout(() => void content.value?.$el.scrollToBottom(150), 350);
  }

  function goToAuth() {
    router.push({ name: "auth", query: { redirect: route.fullPath } });
  }

  function formatArgs(args: unknown) {
    return JSON.stringify(args, null, 2);
  }

  // К новому сообщению — вниз, как в любом чате.
  watch(
    () => [store.visibleMessages.length, store.pending.length, store.loading],
    async () => {
      await nextTick();
      void content.value?.$el.scrollToBottom(150);
    },
  );

  // Вышли (или токен протух) — диалог с данными прежнего аккаунта не должен остаться.
  watch(
    () => authStore.isAuthenticated,
    (authenticated) => {
      if (!authenticated) store.reset();
    },
    { immediate: true },
  );
</script>

<style scoped>
  .hint {
    font-size: 0.9rem;
  }

  /* pre-wrap: модель отвечает абзацами и списками, а разметку мы не рендерим. */
  .bubble {
    max-width: 85%;
    margin: 0 0 8px;
    padding: 8px 12px;
    border-radius: 14px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .bubble.user {
    margin-left: auto;
    background: var(--ion-color-primary);
    color: var(--ion-color-primary-contrast);
  }

  .bubble.assistant {
    margin-right: auto;
    background: var(--ion-color-step-100, rgba(127, 127, 127, 0.15));
  }

  .bubble.muted {
    opacity: 0.7;
  }

  .confirm {
    margin: 8px 0;
    border: 1px solid var(--orange-01);
  }

  .confirm ion-card-content {
    color: var(--ion-text-color);
  }

  .confirm h3 {
    margin: 0 0 8px;
  }

  .action p {
    margin: 0 0 4px;
  }

  .action pre {
    max-height: 160px;
    overflow: auto;
    font-size: 0.75rem;
  }

  .confirm_buttons {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .confirm_buttons ion-button {
    flex: 1;
    margin: 0;
  }

  /* Общая .bulk-bar тянет кнопки на всю ширину — здесь кнопка «отправить» круглая. */
  .composer {
    align-items: flex-end;
  }

  .composer ion-button {
    flex: 0 0 auto;
  }

  .composer ion-textarea {
    flex: 1;
    font-size: 0.9rem;
    min-height: 40px;
    max-height: 120px;
    overflow-y: auto;
  }
</style>

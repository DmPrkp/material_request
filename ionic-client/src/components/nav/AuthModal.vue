<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="handleDismiss"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            :aria-label="$t('ui.buttons.close')"
            @click="emit('close')"
          >
            <ion-icon
              slot="icon-only"
              :icon="closeOutline"
            />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!--
        v-if, а не просто скрытая модалка: форма пересоздаётся на каждое открытие,
        и набранный пароль не висит в DOM после закрытия.
      -->
      <AuthForm
        v-if="isOpen"
        v-model:mode="mode"
        @success="emit('close')"
      />
    </ion-content>
  </ion-modal>
</template>

<script lang="ts" setup>
  /**
   * Вход прямо из шапки — по аватару, без ухода со страницы: заполненная заявка
   * или открытый расчёт остаются на месте. Страница /auth при этом никуда не делась,
   * на неё по-прежнему ведут прямые ссылки и редирект гварда.
   */
  import {
    IonButtons,
    IonHeader,
    IonIcon,
    IonModal,
    IonToolbar,
  } from "@ionic/vue";
  import { closeOutline } from "ionicons/icons";
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import AuthForm from "@/components/pagesParts/auth/AuthForm.vue";

  defineProps<{ isOpen: boolean }>();
  const emit = defineEmits<{ close: [] }>();

  const { t } = useI18n();
  const mode = ref<"login" | "register">("login");

  const title = computed(() =>
    mode.value === "login"
      ? t("pages.auth.title_login")
      : t("pages.auth.title_register")
  );

  function handleDismiss() {
    mode.value = "login";
    emit("close");
  }
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ $t("pages.auth.verify_title") }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div v-if="state === 'checking'" class="centered">
            <ion-spinner name="dots" />
          </div>

          <template v-else>
            <ion-text :color="state === 'done' ? undefined : 'danger'">
              <p class="result-text">{{ message }}</p>
            </ion-text>

            <CutCornerBtn expand="block" fullWidth @click="goOn">
              {{ $t("pages.auth.verify_continue") }}
            </CutCornerBtn>
          </template>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  /**
   * Переход по ссылке из письма. Открывают её из почтового клиента, обычно не войдя
   * в приложение, — поэтому ручка на сервере @Public, а страница в NOINDEX_ROUTES.
   *
   * Подтверждаем сразу на открытии, без кнопки: человек уже подтвердил намерение тем,
   * что щёлкнул по ссылке, второй шаг был бы лишним.
   */
  import { computed, onMounted, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import AuthModel from "@/models/AuthModel";
  import { HttpError } from "@/models/BaseModel";
  import { useAuthStore } from "@/store/auth";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";

  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();
  const authStore = useAuthStore();

  const state = ref<"checking" | "done" | "failed">("checking");
  const message = ref<string>("");

  const locale = computed(() =>
    String(route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE || "ru"),
  );

  onMounted(async () => {
    const token =
      typeof route.query.token === "string" ? route.query.token : "";
    if (!token) {
      state.value = "failed";
      message.value = t("pages.auth.verify_bad_link");
      return;
    }

    try {
      await AuthModel.verifyEmail(token);
      state.value = "done";
      message.value = t("pages.auth.verify_done");
      // Вошедшему обновим профиль, чтобы «не подтверждён» в настройках пропал сразу.
      if (authStore.token) await authStore.fetchProfile();
    } catch (error) {
      state.value = "failed";
      // Тело ошибки до нас не доходит (BaseModel бросает по статусу), но статуса хватает:
      // 409 бывает только от частичного уникального индекса по подтверждённым адресам.
      message.value =
        error instanceof HttpError && error.status === 409
          ? t("pages.auth.verify_taken")
          : t("pages.auth.verify_bad_link");
    }
  });

  function goOn() {
    router.replace(
      authStore.token ? `/${locale.value}/zayavka` : `/${locale.value}/auth`,
    );
  }
</script>

<style scoped>
  ion-card {
    max-width: 480px;
    margin: 40px auto;
  }

  /* Иначе кнопка прилипает к тексту: у <p> внутри ion-text свои поля схлопываются. */
  .result-text {
    margin: 0 0 18px;
  }

  .centered {
    display: flex;
    justify-content: center;
    padding: 24px 0;
  }
</style>

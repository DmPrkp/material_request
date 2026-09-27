<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ $t("pages.auth.forgot_title") }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <template v-if="sent">
            <ion-text>
              <p class="result-text">{{ $t("pages.auth.forgot_sent") }}</p>
            </ion-text>
            <CutCornerBtn
              expand="block"
              fullWidth
              @click="goToAuth"
            >
              {{ $t("pages.auth.login_action") }}
            </CutCornerBtn>
          </template>

          <form
            v-else
            @submit.prevent="handleSubmit"
          >
            <ion-text>
              <p class="lead">{{ $t("pages.auth.forgot_lead") }}</p>
            </ion-text>

            <ion-list>
              <ion-item>
                <ion-label position="stacked">
                  {{ $t("pages.auth.email_label") }}
                </ion-label>
                <ion-input
                  v-model="email"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  autocapitalize="off"
                  required
                />
              </ion-item>
            </ion-list>

            <ion-text
              v-if="errorMessage"
              color="danger"
            >
              <p>{{ errorMessage }}</p>
            </ion-text>

            <CutCornerBtn
              expand="block"
              type="submit"
              fullWidth
              :disabled="isSubmitting"
            >
              <ion-spinner
                v-if="isSubmitting"
                name="dots"
              />
              <span v-else>{{ $t("pages.auth.forgot_action") }}</span>
            </CutCornerBtn>
          </form>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  /**
   * «Забыли пароль»: спрашиваем только адрес.
   *
   * Ответ сервера одинаков и для известного адреса, и для незнакомого — поэтому и здесь
   * показываем одно и то же «письмо отправлено, если такой адрес есть». Иначе страница
   * превратилась бы в проверялку, кто зарегистрирован в приложении.
   */
  import { computed, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import AuthModel from "@/models/AuthModel";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";

  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const email = ref<string>("");
  const sent = ref<boolean>(false);
  const isSubmitting = ref<boolean>(false);
  const errorMessage = ref<string>("");

  const locale = computed(
    () => String(route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE || "ru"),
  );

  async function handleSubmit() {
    isSubmitting.value = true;
    errorMessage.value = "";
    try {
      await AuthModel.forgotPassword(email.value.trim().toLowerCase(), locale.value);
      sent.value = true;
    } catch {
      // Сюда попадаем только если сервер вообще недоступен: на любой адрес он отвечает 204.
      errorMessage.value = t("pages.auth.server_unavailable");
    } finally {
      isSubmitting.value = false;
    }
  }

  function goToAuth() {
    router.replace(`/${locale.value}/auth`);
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


  .lead {
    margin: 0 0 8px;
  }
</style>

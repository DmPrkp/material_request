<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ $t("pages.auth.reset_title") }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <template v-if="done">
            <ion-text>
              <p class="result-text">{{ $t("pages.auth.reset_done") }}</p>
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
            <ion-list>
              <ion-item>
                <ion-label position="stacked">
                  {{ $t("pages.auth.new_password") }}
                </ion-label>
                <ion-input
                  v-model="password"
                  type="password"
                  autocomplete="new-password"
                  :minlength="6"
                  required
                />
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  {{ $t("pages.auth.confirm") }}
                </ion-label>
                <ion-input
                  v-model="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  :minlength="6"
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
              <span v-else>{{ $t("pages.auth.reset_action") }}</span>
            </CutCornerBtn>
          </form>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  /**
   * Новый пароль по ссылке из письма. Ссылка одноразовая и живёт два часа, поэтому
   * «недействительна или устарела» — ожидаемый исход, а не поломка: предлагаем
   * запросить письмо заново.
   */
  import { computed, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import AuthModel from "@/models/AuthModel";
  import { HttpError } from "@/models/BaseModel";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";

  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const password = ref<string>("");
  const confirmPassword = ref<string>("");
  const done = ref<boolean>(false);
  const isSubmitting = ref<boolean>(false);
  const errorMessage = ref<string>("");

  const locale = computed(
    () => String(route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE || "ru"),
  );

  async function handleSubmit() {
    const token = typeof route.query.token === "string" ? route.query.token : "";
    if (!token) {
      errorMessage.value = t("pages.auth.reset_bad_link");
      return;
    }

    if (password.value !== confirmPassword.value) {
      errorMessage.value = t("pages.auth.password_mismatch");
      return;
    }

    isSubmitting.value = true;
    errorMessage.value = "";
    try {
      await AuthModel.resetPassword(token, password.value);
      done.value = true;
    } catch (error) {
      errorMessage.value =
        error instanceof HttpError && error.status === 400
          ? t("pages.auth.reset_bad_link")
          : t("pages.auth.server_unavailable");
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

</style>

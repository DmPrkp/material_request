<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ $t("pages.feedback.title") }}</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <!-- Гостю формы нет: ручка записи только для вошедших, иначе её набьют мусором. -->
          <template v-if="!signedIn">
            <ion-text>
              <p class="lead">{{ $t("pages.feedback.guest_lead") }}</p>
            </ion-text>
            <a
              class="mail"
              :href="`mailto:${SUPPORT_EMAIL}`"
              >{{ SUPPORT_EMAIL }}</a
            >
            <ion-text color="medium">
              <p class="hint">{{ $t("pages.feedback.guest_hint") }}</p>
            </ion-text>
          </template>

          <template v-else-if="sent">
            <ion-text>
              <p class="lead">{{ $t("pages.feedback.sent") }}</p>
            </ion-text>
            <CutCornerBtn
              expand="block"
              fullWidth
              @click="again"
            >
              {{ $t("pages.feedback.sent_more") }}
            </CutCornerBtn>
          </template>

          <form
            v-else
            @submit.prevent="handleSubmit"
          >
            <ion-segment v-model="topic">
              <ion-segment-button value="bug">
                {{ $t("pages.feedback.topic_bug") }}
              </ion-segment-button>
              <ion-segment-button value="idea">
                {{ $t("pages.feedback.topic_idea") }}
              </ion-segment-button>
            </ion-segment>

            <ion-list>
              <ion-item>
                <ion-label position="stacked">
                  {{ $t("pages.feedback.message") }}
                </ion-label>
                <ion-textarea
                  v-model="message"
                  :placeholder="$t('pages.feedback.placeholder')"
                  :auto-grow="true"
                  :rows="6"
                  :counter="true"
                  :maxlength="4000"
                  required
                />
              </ion-item>
            </ion-list>

            <ion-text
              v-if="errorMessage"
              color="danger"
            >
              <p class="hint">{{ errorMessage }}</p>
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
              <span v-else>{{ $t("pages.feedback.send") }}</span>
            </CutCornerBtn>
          </form>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  /**
   * Обратная связь. Вошедшему — форма, гостю — почта: ручка записи закрыта входом,
   * и открывать её ради анонимных сообщений значит получить спам вместо обращений.
   *
   * Обращения читает админка (`:8090` → «Пользователи» → «Обращения») прямо из базы,
   * отвечают на них почтой из профиля автора.
   */
  import { IonTextarea } from "@ionic/vue";
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import { SUPPORT_EMAIL } from "@/constants/contacts";
  import UserModel from "@/models/UserModel";
  import { useAuthStore } from "@/store/auth";

  const authStore = useAuthStore();
  const { t } = useI18n();

  // Именно состояние входа, а не AUTH_ENABLED: форме нужен настоящий токен,
  // иначе сервер ответит 401, сколько бы флаг ни разрешал.
  const signedIn = computed(() => authStore.isAuthenticated);

  const topic = ref<"bug" | "idea">("bug");
  const message = ref<string>("");
  const sent = ref<boolean>(false);
  const isSubmitting = ref<boolean>(false);
  const errorMessage = ref<string>("");

  async function handleSubmit() {
    const text = message.value.trim();
    if (!text) {
      errorMessage.value = t("pages.feedback.empty");
      return;
    }

    isSubmitting.value = true;
    errorMessage.value = "";
    try {
      await UserModel.sendFeedback({ topic: topic.value, message: text });
      sent.value = true;
      message.value = "";
    } catch {
      errorMessage.value = t("pages.feedback.error");
    } finally {
      isSubmitting.value = false;
    }
  }

  function again() {
    sent.value = false;
    topic.value = "bug";
  }
</script>

<style scoped>
  ion-card {
    max-width: 480px;
    margin: 40px auto;
  }

  .lead {
    margin: 0 0 12px;
  }

  .hint {
    margin: 8px 0 0;
    font-size: 0.85rem;
  }

  .mail {
    display: inline-block;
    font-size: 1.05rem;
    color: var(--ion-color-primary);
  }

  ion-segment {
    margin-bottom: 8px;
  }
</style>

<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ $t("pages.settings.title") }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h2>{{ $t("pages.settings.email") }}</h2>
                <p>{{ displayIdentifier }}</p>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <h2>{{ $t("pages.settings.joined") }}</h2>
                <p>
                  {{
                    formattedDate(
                      authStore.user?.createdAt ?? authStore.user?.updatedAt
                    )
                  }}
                </p>
              </ion-label>
            </ion-item>
          </ion-list>
          <ion-button expand="block" color="medium" @click="handleLogout">
            {{ $t("pages.settings.logout") }}
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  import {
    IonPage,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
  } from "@ionic/vue";
  import { computed } from "vue";
  import { useAuthStore } from "@/store/auth";
  import { useRouter, useRoute } from "vue-router";

  const authStore = useAuthStore();
  const router = useRouter();
  const route = useRoute();

  const displayIdentifier = computed(
    () => authStore.user?.email ?? authStore.user?.username ?? "—"
  );

  function formattedDate(date?: string) {
    if (!date) return "—";
    const locale =
      typeof route.params.locale === "string"
        ? route.params.locale
        : import.meta.env.VITE_DEFAULT_LOCALE;
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }
    return parsedDate.toLocaleString(locale);
  }

  function handleLogout() {
    authStore.logout();
    const locale =
      typeof route.params.locale === "string"
        ? route.params.locale
        : import.meta.env.VITE_DEFAULT_LOCALE;
    router.replace({ name: "auth", params: { locale } });
  }
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>
          <h1>{{ $t("pages.not_found.title") }}</h1>
        </ion-title>
      </ion-item-divider>
      <p>{{ $t("pages.not_found.text") }}</p>
      <ion-button
        class="add_btn"
        :router-link="`/${locale}/zayavka`"
      >
        {{ $t("pages.not_found.home") }}
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  import { useI18n } from "vue-i18n";

  const { locale } = useI18n();
</script>

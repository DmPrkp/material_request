<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ $t("pages.warehouses.add") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-list>
      <ion-item>
        <ion-input
          v-model="name"
          :label="$t('pages.warehouses.name')"
          label-placement="stacked"
          :maxlength="100"
          :clear-input="true"
        />
      </ion-item>
      <!--
        Компанию не выбирают — склад заводится в текущей (настройки → Компании).
        Переключатель только на личный склад: он ничьей компании не принадлежит.
      -->
      <ion-item v-if="company">
        <ion-toggle v-model="personal">
          {{ $t("pages.warehouses.personal_one") }}
        </ion-toggle>
      </ion-item>
      <ion-item
        v-else
        lines="none"
      >
        <ion-label class="ion-text-wrap">
          <p>{{ $t("pages.warehouses.personal_one") }}</p>
        </ion-label>
      </ion-item>
    </ion-list>
    <!--
      Кнопки в содержимом, а не в ion-footer: шторка открыта на 60%, и футер
      (он внизу модалки полной высоты) оставался за краем экрана.
    -->
    <ion-row class="actions">
      <ion-col size="6">
        <ion-button
          fill="outline"
          expand="block"
          :disabled="!name.trim()"
          @click="confirm"
        >
          {{ $t("ui.buttons.add") }}
        </ion-button>
      </ion-col>
      <ion-col size="6">
        <ion-button
          fill="clear"
          expand="block"
          @click="cancel"
        >
          {{ $t("ui.buttons.cancel") }}
        </ion-button>
      </ion-col>
    </ion-row>
  </ion-content>
</template>

<script setup lang="ts">
  import {
    IonCol,
    IonHeader,
    IonRow,
    IonToolbar,
    modalController,
  } from "@ionic/vue";
  import { ref } from "vue";
  import type { Company, WarehouseCreateInput } from "@/types/dto";

  /** Текущая компания; нет — «Личное», склад без компании. */
  const props = defineProps<{ company?: Company }>();

  const name = ref("");
  const personal = ref(false);

  function confirm() {
    const trimmed = name.value.trim();
    if (!trimmed) return;
    const result: WarehouseCreateInput = {
      name: trimmed,
      companyId: personal.value ? undefined : props.company?.id,
    };
    modalController.dismiss(result, "confirm");
  }

  function cancel() {
    modalController.dismiss(null, "cancel");
  }
</script>

<style scoped>
  .actions {
    margin-top: 16px;
  }
</style>

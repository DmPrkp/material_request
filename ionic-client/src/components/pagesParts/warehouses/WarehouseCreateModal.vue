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
      <!-- Нет компаний, где можно заводить склады, — выбирать нечего, склад личный. -->
      <ion-item v-if="companies.length">
        <ion-select
          v-model="companyId"
          :label="$t('pages.warehouses.company')"
          label-placement="stacked"
          interface="action-sheet"
          :cancel-text="$t('ui.buttons.cancel')"
        >
          <ion-select-option :value="PERSONAL">
            {{ $t("pages.warehouses.personal") }}
          </ion-select-option>
          <ion-select-option
            v-for="company in companies"
            :key="company.id"
            :value="company.id"
          >
            {{ company.name }}
          </ion-select-option>
        </ion-select>
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
    IonSelect,
    IonSelectOption,
    IonToolbar,
    modalController,
  } from "@ionic/vue";
  import { ref } from "vue";
  import type { Company, WarehouseCreateInput } from "@/types/dto";

  /** ion-select не различает null и «не выбрано» — личный склад отдельным значением. */
  const PERSONAL = 0;

  /** Только компании, где создатель own/manage: в остальных warehouse-server ответит 403. */
  defineProps<{ companies: Company[] }>();

  const name = ref("");
  const companyId = ref<number>(PERSONAL);

  function confirm() {
    const trimmed = name.value.trim();
    if (!trimmed) return;
    const result: WarehouseCreateInput = {
      name: trimmed,
      companyId: companyId.value === PERSONAL ? undefined : companyId.value,
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

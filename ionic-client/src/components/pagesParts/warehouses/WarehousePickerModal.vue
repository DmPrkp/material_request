<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ $t("pages.warehouses.pick") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-list v-if="warehouses.length">
      <ion-item
        v-for="warehouse in warehouses"
        :key="warehouse.id"
        button
        @click="pick(warehouse)"
      >
        <ion-label class="ion-text-wrap">{{ warehouse.name }}</ion-label>
        <ion-note
          v-if="warehouse.companyId"
          slot="end"
        >
          {{ companyName(warehouse.companyId) }}
        </ion-note>
      </ion-item>
    </ion-list>

    <ion-note
      v-else
      class="hint"
    >
      {{ $t("pages.warehouses.empty") }}
    </ion-note>

    <!--
      Кнопки в содержимом, а не в ion-footer: шторка открыта на 60%, и футер
      (он внизу модалки полной высоты) оставался бы за краем экрана.
    -->
    <ion-row class="actions">
      <ion-col size="12">
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

<script lang="ts" setup>
  import { IonNote, IonRow, modalController } from "@ionic/vue";
  import type { Company, Warehouse } from "@/types/dto";

  const props = defineProps<{
    warehouses: Warehouse[];
    /** Только для подписи склада; не загрузились — подписи просто нет. */
    companies?: Company[];
  }>();

  function companyName(id: number) {
    return props.companies?.find((company) => company.id === id)?.name ?? "";
  }

  function pick(warehouse: Warehouse) {
    modalController.dismiss(warehouse, "confirm");
  }

  function cancel() {
    modalController.dismiss(null, "cancel");
  }
</script>

<style scoped>
  .actions {
    margin-top: 12px;
  }

  .hint {
    display: block;
    padding: 16px;
    text-align: center;
  }
</style>

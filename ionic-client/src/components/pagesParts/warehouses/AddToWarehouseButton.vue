<template>
  <!-- Без входа склада нет вовсе: сервис отвечает 401, кнопку не показываем. -->
  <ion-button
    v-if="authStore.isAuthenticated"
    class="add_btn"
    fill="outline"
    size="small"
    :disabled="busy"
    @click="chooseWarehouse"
  >
    <ion-icon
      slot="start"
      :icon="fileTrayStackedOutline"
    />
    <span class="slanted">{{ $t("pages.warehouses.add_items") }}</span>
  </ion-button>
</template>

<script lang="ts" setup>
  import { alertController, IonIcon, modalController, toastController } from "@ionic/vue";
  import { fileTrayStackedOutline } from "ionicons/icons";
  import { ref } from "vue";
  import { useI18n } from "vue-i18n";
  import CompanyModel from "@/models/CompanyModel";
  import WarehouseModel from "@/models/WarehouseModel";
  import { useAuthStore } from "@/store/auth";
  import type { Warehouse } from "@/types/dto";
  import WarehousePickerModal from "./WarehousePickerModal.vue";
  import { zaiavkaToWarehouseItems, type ZaiavkaItemsSource } from "./zaiavkaItems";

  /**
   * «Добавить на склад»: весь список заявки уезжает на выбранный склад одной пачкой.
   * Позиции складываются с лежащими там же (сервер, POST /warehouses/:id/items).
   */
  const props = defineProps<{ zaiavka: ZaiavkaItemsSource }>();

  const { t } = useI18n();
  const authStore = useAuthStore();
  const busy = ref(false);

  async function chooseWarehouse() {
    const items = zaiavkaToWarehouseItems(props.zaiavka);
    if (!items.length) return notify(t("pages.warehouses.nothing_to_add"));

    busy.value = true;
    // Компании — только ради подписи склада в списке, их отсутствие не мешает.
    const [warehouses, companies] = await Promise.all([
      WarehouseModel.listMine(),
      CompanyModel.listMine(),
    ]);
    busy.value = false;
    if (!warehouses) return notify(t("pages.warehouses.load_error"));

    const modal = await modalController.create({
      component: WarehousePickerModal,
      componentProps: { warehouses, companies: companies ?? [] },
      breakpoints: [0, 0.6, 1],
      initialBreakpoint: 0.6,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss<Warehouse>();
    if (role === "confirm" && data) await confirmAndSend(data, items);
  }

  async function confirmAndSend(
    warehouse: Warehouse,
    items: ReturnType<typeof zaiavkaToWarehouseItems>,
  ) {
    const alert = await alertController.create({
      header: t("pages.warehouses.confirm_add", { name: warehouse.name }),
      message: t("pages.warehouses.confirm_count", { count: items.length }),
      buttons: [
        { text: t("ui.buttons.cancel"), role: "cancel" },
        { text: t("ui.buttons.add"), role: "confirm" },
      ],
    });
    await alert.present();

    const { role } = await alert.onWillDismiss();
    if (role !== "confirm") return;

    busy.value = true;
    try {
      await WarehouseModel.addItems(warehouse.id, items);
      await notify(t("pages.warehouses.added", { name: warehouse.name }));
    } catch (error) {
      console.error("Не удалось добавить позиции на склад", error);
      await notify(t("pages.warehouses.add_items_error"));
    } finally {
      busy.value = false;
    }
  }

  async function notify(message: string) {
    const toast = await toastController.create({ message, duration: 2500 });
    await toast.present();
  }
</script>

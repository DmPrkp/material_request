<template>
  <!--
    Без входа склада нет вовсе: сервис отвечает 401, полосу не показываем.
    Полоса, а не кнопка в шапке: страница заявки длинная, и кнопка наверху уезжала бы
    вместе с ней. Вид — общий bulk-bar, как у групповых операций в списке заявок;
    slot="fixed" ставит её страница, иначе она прокручивалась бы с содержимым.
  -->
  <div
    v-if="authStore.isAuthenticated"
    class="bulk-bar"
  >
    <ion-button
      fill="outline"
      :disabled="busy"
      @click="chooseWarehouse"
    >
      {{ $t("pages.warehouses.add_items") }}
    </ion-button>
  </div>
</template>

<script lang="ts" setup>
  import { alertController, modalController, toastController } from "@ionic/vue";
  import { ref } from "vue";
  import { useI18n } from "vue-i18n";
  import WarehouseModel from "@/models/WarehouseModel";
  import { useAuthStore } from "@/store/auth";
  import { useCompanyStore } from "@/store/company";
  import { tokenUser } from "@/store/authToken";
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
  const companyStore = useCompanyStore();
  const busy = ref(false);

  async function chooseWarehouse() {
    const items = zaiavkaToWarehouseItems(props.zaiavka);
    if (!items.length) return notify(t("pages.warehouses.nothing_to_add"));

    busy.value = true;
    const me = authStore.token ? tokenUser(authStore.token) : undefined;
    if (!companyStore.loaded) await companyStore.load(me?.id);
    // Склады текущей компании и свои личные — те же два раздела, что на экране складов.
    const current = companyStore.currentId ?? null;
    const [company, personal] = await Promise.all([
      current === null ? Promise.resolve([]) : WarehouseModel.listByCompany(current),
      WarehouseModel.listByCompany(null),
    ]);
    busy.value = false;
    if (!company || !personal) return notify(t("pages.warehouses.load_error"));
    const warehouses = [
      ...company.filter((warehouse) => warehouse.companyId === current),
      ...personal.filter((warehouse) => warehouse.companyId === null),
    ];

    const modal = await modalController.create({
      component: WarehousePickerModal,
      componentProps: { warehouses, companies: companyStore.companies },
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

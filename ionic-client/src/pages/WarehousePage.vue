<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>
          <h1>{{ warehouse?.name || $t("pages.warehouses.title") }}</h1>
        </ion-title>
      </ion-item-divider>

      <ion-text
        v-if="error"
        class="hint"
        color="danger"
      >
        {{ $t(error) }}
      </ion-text>

      <template v-else>
        <!-- Выделение доступно всегда: строка склада никуда не ведёт, нажатие её выделяет. -->
        <ion-row
          v-if="loaded && groups.length"
          class="select-row ion-justify-content-end"
        >
          <ion-button
            fill="clear"
            size="small"
            @click="toggleAll"
          >
            {{
              $t(
                allSelected
                  ? "pages.warehouses.clear_selection"
                  : "pages.warehouses.select_all"
              )
            }}
          </ion-button>
        </ion-row>

        <ion-item-group
          v-for="group in groups"
          :key="group.kind"
        >
          <ion-item-divider>
            <ion-label color="secondary">
              <h2>{{ $t(`pages.warehouses.kinds.${group.kind}`) }}</h2>
            </ion-label>
          </ion-item-divider>
          <ion-item
            v-for="item in group.items"
            :key="item.id"
            :class="{ selected: selected.has(item.id) }"
            button
            :detail="false"
            @click="onRowClick(item.id)"
          >
            <ion-label class="ion-text-wrap">
              {{ item.title }}
              <p v-if="item.details">{{ item.details }}</p>
            </ion-label>
            <ion-note slot="end">
              {{ item.quantity }} {{ item.measure || $t("measure.pcs") }}
            </ion-note>
            <!--
              Иконка, а не ion-checkbox: тот внутри ion-item становится вводом строки,
              ловит её клик и переключал бы выделение второй раз (как в списке заявок).
            -->
            <IonIcon
              slot="end"
              class="check"
              :icon="selected.has(item.id) ? checkbox : squareOutline"
              :color="selected.has(item.id) ? 'primary' : undefined"
              role="checkbox"
              :aria-checked="selected.has(item.id)"
              :aria-label="item.title"
            />
          </ion-item>
        </ion-item-group>

        <ion-note
          v-if="loaded && !groups.length"
          class="hint"
        >
          {{ $t("pages.warehouses.items_empty") }}
        </ion-note>
        <!-- Чтобы последние строки не прятались под панелью действий. -->
        <div
          v-if="selected.size"
          class="bulk-spacer"
        />
      </template>

      <!-- Групповые действия — внизу, под большой палец, как в списке заявок. -->
      <div
        v-if="selected.size"
        slot="fixed"
        class="bulk-bar"
      >
        <ion-button
          color="danger"
          fill="outline"
          size="small"
          :disabled="busy"
          @click="openAction('remove')"
        >
          {{ $t("pages.warehouses.delete_items", { count: selected.size }) }}
        </ion-button>
        <ion-button
          fill="outline"
          size="small"
          :disabled="busy"
          @click="openAction('move')"
        >
          {{ $t("pages.warehouses.move_items") }}
        </ion-button>
        <!-- Выдают на руки участнику компании: с личного склада некому. -->
        <ion-button
          v-if="warehouse?.companyId"
          fill="outline"
          size="small"
          :disabled="busy"
          @click="openAction('issue')"
        >
          {{ $t("pages.warehouses.issue_items") }}
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  /**
   * Содержимое склада. Позиции названы ссылками — названия и параметры добирает
   * itemLabels у словаря; не отдал словарь — показываем ссылку.
   */
  import {
    IonIcon,
    IonNote,
    IonRow,
    modalController,
    toastController,
  } from "@ionic/vue";
  import { checkbox, squareOutline } from "ionicons/icons";
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute } from "vue-router";
  import {
    ITEM_KINDS as KINDS,
    useItemLabels,
  } from "@/components/pagesParts/warehouses/itemLabels";
  import WarehouseItemsActionModal from "@/components/pagesParts/warehouses/WarehouseItemsActionModal.vue";
  import type {
    ActionPerson,
    ItemsAction,
    ItemsActionResult,
  } from "@/components/pagesParts/warehouses/WarehouseItemsActionModal.vue";
  import CompanyModel from "@/models/CompanyModel";
  import UserModel, { userLabel } from "@/models/UserModel";
  import WarehouseModel from "@/models/WarehouseModel";
  import { useAuthStore } from "@/store/auth";
  import type {
    Company,
    Warehouse,
    WarehouseItem,
    WarehouseItemKind,
  } from "@/types/dto";

  type ItemRow = {
    id: number;
    title: string;
    details: string;
    measure: string;
    quantity: number;
  };

  const { t } = useI18n();
  const route = useRoute();
  const authStore = useAuthStore();
  const { itemLabels } = useItemLabels();

  const warehouse = ref<Warehouse>();
  const rows = ref<Record<WarehouseItemKind, ItemRow[]>>(emptyRows());
  const loaded = ref(false);
  const error = ref("");
  /** Выбранные позиции (id строк склада) и занятость групповым действием. */
  const selected = ref(new Set<number>());
  const busy = ref(false);

  const groups = computed(() =>
    KINDS.filter((kind) => rows.value[kind].length).map((kind) => ({
      kind,
      items: rows.value[kind],
    }))
  );

  function emptyRows(): Record<WarehouseItemKind, ItemRow[]> {
    return { material: [], hand_tool: [], power_tool: [] };
  }

  async function load() {
    if (!authStore.isAuthenticated) {
      error.value = "pages.warehouses.auth_required";
      return;
    }
    loaded.value = false;
    error.value = "";
    const id = Number(route.params.warehouse);

    const [found, items] = await Promise.all([
      WarehouseModel.byId(id),
      WarehouseModel.items(id),
    ]);
    // get() глотает и сеть, и 404 чужого склада — для страницы это одно и то же.
    if (!found || !items) {
      error.value = "pages.warehouses.load_error";
      return;
    }

    warehouse.value = found;
    rows.value = await withNames(items);
    loaded.value = true;
  }

  // Другой склад — прежнее выделение к нему не относится.
  watch(
    () => [route.params.warehouse, authStore.token],
    () => {
      selected.value = new Set();
      void load();
    },
    { immediate: true }
  );

  /* ------------------------------------------------ выделение и действия */


  const allIds = computed(() =>
    KINDS.flatMap((kind) => rows.value[kind].map((row) => row.id))
  );
  const allSelected = computed(
    () =>
      allIds.value.length > 0 && selected.value.size === allIds.value.length
  );

  function onRowClick(id: number) {
    const next = new Set(selected.value);
    if (!next.delete(id)) next.add(id);
    selected.value = next;
  }

  function toggleAll() {
    selected.value = allSelected.value ? new Set() : new Set(allIds.value);
  }

  /** После действия выделение сбрасываем: позиции ушли или их количество уже другое. */
  async function afterAction(message: string) {
    selected.value = new Set();
    await load();
    await notify(message);
  }

  /**
   * Удалить, переместить, выдать — одна форма (WarehouseItemsActionModal): у каждой
   * выбранной позиции сколько взять, у перемещения ещё и куда. «Готово» в форме и есть
   * подтверждение, отдельного вопроса «вы уверены» нет.
   */
  async function openAction(mode: ItemsAction) {
    const from = warehouse.value;
    if (!from) return;
    const items = KINDS.flatMap((kind) =>
      rows.value[kind].filter((row) => selected.value.has(row.id))
    );

    let targets: Warehouse[] = [];
    let companies: Company[] = [];
    let people: ActionPerson[] = [];
    if (mode === "issue" && from.companyId) {
      busy.value = true;
      try {
        const found = await issueRecipients(from.companyId);
        if (!found) {
          await notify(t("pages.warehouses.members_error"));
          return;
        }
        people = found;
      } finally {
        busy.value = false;
      }
    }
    if (mode === "move") {
      busy.value = true;
      try {
        const [found, mine] = await Promise.all([
          WarehouseModel.listByCompany(from.companyId),
          from.companyId ? CompanyModel.listMine() : Promise.resolve([]),
        ]);
        if (!found) {
          await notify(t("pages.warehouses.load_error"));
          return;
        }
        // Только туда, куда примет warehouse-server (canMoveItems): та же компания,
        // с личного — на личный, действующий и не сам этот склад.
        targets = found.filter(
          (target) =>
            target.id !== from.id &&
            target.isActive &&
            target.companyId === from.companyId
        );
        companies = mine ?? [];
      } finally {
        busy.value = false;
      }
    }

    const modal = await modalController.create({
      component: WarehouseItemsActionModal,
      componentProps: { mode, items, warehouses: targets, companies, people },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<ItemsActionResult>();
    if (role !== "confirm" || !data) return;

    busy.value = true;
    try {
      if (mode === "issue" && data.holderId) {
        await WarehouseModel.issueItems(from.id, data.items, data.holderId);
        const name = people.find((p) => p.id === data.holderId)?.label;
        await afterAction(t("pages.warehouses.issued", { name }));
      } else if (mode === "remove") {
        await WarehouseModel.removeItems(from.id, data.items);
        await afterAction(
          t("pages.warehouses.deleted_items", { count: data.items.length })
        );
      } else if (data.targetWarehouseId) {
        await WarehouseModel.moveItems(
          from.id,
          data.items,
          data.targetWarehouseId
        );
        const name = targets.find((w) => w.id === data.targetWarehouseId)?.name;
        await afterAction(t("pages.warehouses.moved", { name }));
      }
    } catch (err) {
      console.error("Не удалось выполнить действие со складом", err);
      const key = {
        remove: "pages.warehouses.delete_items_error",
        move: "pages.warehouses.move_error",
        issue: "pages.warehouses.issue_error",
      }[mode];
      await notify(t(key));
    } finally {
      busy.value = false;
    }
  }

  async function notify(message: string) {
    const toast = await toastController.create({ message, duration: 2500 });
    await toast.present();
  }

  /**
   * Кому можно выдать: участники компании склада, с именами от user-server. Не отдал
   * имён — всё равно выдаём, подпишем id: список участников важнее подписи.
   */
  async function issueRecipients(
    companyId: number
  ): Promise<ActionPerson[] | undefined> {
    const members = await CompanyModel.members(companyId);
    if (!members) return undefined;
    const ids = members.map((member) => member.userId);
    const names = ids.length ? await UserModel.names(ids) : [];
    const byId = new Map((names ?? []).map((user) => [user.id, user]));
    return ids.map((id) => ({ id, label: userLabel(byId.get(id), id) }));
  }

  async function withNames(items: WarehouseItem[]) {
    const labels = await itemLabels(items);
    const result = emptyRows();
    for (const item of items) {
      const label = labels.get(item.id);
      result[item.kind].push({
        id: item.id,
        title: label?.title ?? item.ref,
        details: label?.details ?? "",
        measure: label?.measure ?? "",
        quantity: item.quantity,
      });
    }
    return result;
  }
</script>

<style scoped>
  .select-row {
    margin: 12px 0 4px;
  }

  ion-item.selected {
    --background: rgba(var(--ion-color-primary-rgb), 0.12);
  }

  .check {
    font-size: 20px;
    margin-inline-start: 12px;
  }

  .bulk-spacer {
    height: 64px;
  }

  .bulk-bar {
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    gap: 8px;
    padding: 8px;
    background: var(--ion-background-color);
    border-top: 1px solid var(--ion-color-step-150, rgba(127, 127, 127, 0.3));
  }

  .bulk-bar ion-button {
    flex: 1;
    margin: 0;
  }

  .hint {
    display: block;
    padding: 16px;
    text-align: center;
  }
</style>

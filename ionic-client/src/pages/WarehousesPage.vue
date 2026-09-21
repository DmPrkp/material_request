<template>
  <ion-page v-if="route.name === 'warehouses'">
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>{{ $t("pages.warehouses.title") }}</ion-title>
      </ion-item-divider>

      <!-- Склад — чей-то (owner_id из токена): без входа сервис отвечает 401. -->
      <ion-item
        v-if="!authStore.isAuthenticated"
        class="auth-warning"
        lines="none"
        button
        @click="goToAuth"
      >
        <IonIcon
          slot="start"
          :icon="alertCircle"
        />
        <ion-label class="ion-text-wrap">
          {{ $t("pages.warehouses.auth_required") }}
        </ion-label>
      </ion-item>

      <template v-else>
        <ion-row class="add-row ion-justify-content-end">
          <CutCornerBtn @click="addWarehouse">
            {{ $t("pages.warehouses.add") }}
          </CutCornerBtn>
        </ion-row>

        <!--
          Стрелка — штатная, как в сборниках. Нажатие по строке ведёт на склад, а не
          раскрывает: до аккордеона такой клик не доходит (stopPropagation). Клик по
          самой стрелке пропускаем — её раскрывает Ionic, состояние держит v-model.
        -->
        <ion-accordion-group v-model="expanded">
          <ion-accordion
            v-for="warehouse in warehouses"
            :key="warehouse.id"
            :value="String(warehouse.id)"
          >
            <ion-item
              slot="header"
              button
              :detail="false"
              @click="onHeaderClick($event, warehouse.id)"
            >
              <ion-label class="ion-text-wrap">
                {{ warehouse.name }}
              </ion-label>
              <ion-note
                v-if="warehouse.companyId"
                slot="end"
              >
                {{ companyName(warehouse.companyId) }}
              </ion-note>
            </ion-item>
            <div slot="content">
              <!-- Счётчики — строками <p> в одной ячейке: так они мельче и плотнее,
                   отдельными ion-item каждая занимала бы строку списка. -->
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p
                    v-for="kind in ITEM_KINDS"
                    :key="kind"
                  >
                    {{ $t(`pages.warehouses.kinds.${kind}`) }} —
                    {{ warehouse.counts?.[kind] ?? 0 }}
                    {{ $t("pages.warehouses.units") }}
                  </p>
                </ion-label>
              </ion-item>
              <ion-row
                v-if="canRemove(warehouse)"
                class="ion-justify-content-end"
              >
                <CutCornerBtn
                  class="remove_btn"
                  @click="removeWarehouse(warehouse)"
                >
                  {{ $t("ui.buttons.remove") }}
                </CutCornerBtn>
              </ion-row>
            </div>
          </ion-accordion>
        </ion-accordion-group>

        <ion-note
          v-if="state === 'empty'"
          class="hint"
        >
          {{ $t("pages.warehouses.empty") }}
        </ion-note>
        <ion-text
          v-if="state === 'error'"
          class="hint"
          color="danger"
        >
          {{ $t("pages.warehouses.load_error") }}
        </ion-text>
      </template>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script lang="ts" setup>
  import {
    alertController,
    IonAccordion,
    IonAccordionGroup,
    IonIcon,
    IonNote,
    IonRow,
    modalController,
  } from "@ionic/vue";
  import { alertCircle } from "ionicons/icons";
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import WarehouseModel from "@/models/WarehouseModel";
  import CompanyModel from "@/models/CompanyModel";
  import WarehouseCreateModal from "@/components/pagesParts/warehouses/WarehouseCreateModal.vue";
  import { HttpError } from "@/models/BaseModel";
  import { useAuthStore } from "@/store/auth";
  import { tokenUser } from "@/store/authToken";
  import type {
    Company,
    Warehouse,
    WarehouseCreateInput,
    WarehouseItemKind,
  } from "@/types/dto";

  /** Порядок разделов — как в заявке: материалы, ручной, электро. */
  const ITEM_KINDS: WarehouseItemKind[] = [
    "material",
    "hand_tool",
    "power_tool",
  ];

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();

  const warehouses = ref<Warehouse[]>([]);
  /** Раскрытый склад; значение ведёт ion-accordion-group. */
  const expanded = ref<string>();
  /** Все мои компании — для подписи склада; заводить склад можно не во всех. */
  const companies = ref<Company[]>([]);
  const loaded = ref<"loading" | "done" | "error">("loading");

  const state = computed(() => {
    if (loaded.value === "error") return "error";
    if (loaded.value === "done" && !warehouses.value.length) return "empty";
    return "list";
  });

  async function load() {
    if (!authStore.isAuthenticated) {
      warehouses.value = [];
      return;
    }
    loaded.value = "loading";
    const [items, myCompanies] = await Promise.all([
      WarehouseModel.listMine(),
      CompanyModel.listMine(),
    ]);
    // Компании не загрузились — склады всё равно показываем, только без подписей.
    companies.value = myCompanies ?? [];
    if (!items) {
      loaded.value = "error";
      return;
    }
    warehouses.value = items;
    loaded.value = "done";
  }

  // Вошли или вышли, не уходя со страницы, — список другого человека.
  watch(() => authStore.token, load, { immediate: true });

  /**
   * Удаляют создатель, own/manage компании склада и админ — так решает warehouse-server
   * (managed в warehouses.service.ts). Здесь — чтобы не показывать кнопку, которая
   * ответит 403.
   */
  function canRemove(warehouse: Warehouse) {
    const me = authStore.token ? tokenUser(authStore.token) : undefined;
    if (!me) return false;
    if (me.role === "ADMIN" || warehouse.ownerId === me.id) return true;
    return creatableCompanies.value.some((c) => c.id === warehouse.companyId);
  }

  /** Склад уходит вместе с содержимым — спрашиваем, и удаление помечено destructive. */
  async function removeWarehouse(warehouse: Warehouse) {
    const alert = await alertController.create({
      header: t("pages.warehouses.remove_confirm.header", {
        name: warehouse.name,
      }),
      message: t("pages.warehouses.remove_confirm.message"),
      buttons: [
        { text: t("ui.buttons.cancel"), role: "cancel" },
        { text: t("ui.buttons.remove"), role: "destructive" },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== "destructive") return;

    try {
      await WarehouseModel.remove(warehouse.id);
      warehouses.value = warehouses.value.filter((w) => w.id !== warehouse.id);
    } catch (error) {
      console.error("Не удалось удалить склад", error);
      const failed = await alertController.create({
        header: t("pages.warehouses.remove_error"),
        buttons: [t("ui.buttons.close")],
      });
      await failed.present();
    }
  }

  function onHeaderClick(event: MouseEvent, id: number) {
    const target = event.target as HTMLElement;
    if (target.closest(".ion-accordion-toggle-icon")) return;
    event.stopPropagation();
    openWarehouse(id);
  }

  function openWarehouse(id: number) {
    router.push({ name: "warehouse", params: { warehouse: id } });
  }

  function goToAuth() {
    router.push({ name: "auth", query: { redirect: route.fullPath } });
  }

  /** Склад без компании или в компании, где пользователь own/manage — так решает сервер. */
  const creatableCompanies = computed(() =>
    companies.value.filter((c) =>
      c.roles.some((role) => role === "own" || role === "manage")
    )
  );

  function companyName(id: number) {
    return companies.value.find((c) => c.id === id)?.name ?? "";
  }

  /** Нижняя модалка-форма: на телефоне поля под пальцем, страница остаётся под ней. */
  async function addWarehouse() {
    const modal = await modalController.create({
      component: WarehouseCreateModal,
      componentProps: { companies: creatableCompanies.value },
      breakpoints: [0, 0.6, 1],
      initialBreakpoint: 0.6,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss<WarehouseCreateInput>();
    if (role === "confirm" && data) await save(data);
  }

  async function save(input: WarehouseCreateInput) {
    try {
      const created = await WarehouseModel.create(input);
      warehouses.value = [...warehouses.value, created];
      loaded.value = "done";
    } catch (error) {
      console.error("Не удалось добавить склад", error);
      // 409 — склад с таким названием у пользователя уже есть (без учёта регистра);
      // 403 — в компании уже нет прав own/manage (сняли, пока форма была открыта).
      const status = error instanceof HttpError ? error.status : undefined;
      const key =
        status === 409
          ? "pages.warehouses.duplicate"
          : status === 403
            ? "pages.warehouses.company_forbidden"
            : "pages.warehouses.create_error";
      const alert = await alertController.create({
        header: t(key),
        buttons: [t("ui.buttons.close")],
      });
      await alert.present();
    }
  }
</script>

<style scoped>
  /* Удаление — красным: кнопка красит себя переменной --color. */
  .remove_btn {
    --color: var(--ion-color-danger);
  }

  .add-row {
    margin: 12px 0;
  }

  .hint {
    display: block;
    padding: 16px;
    text-align: center;
  }

  .auth-warning {
    --background: transparent;
    --color: var(--orange-01);
    margin: 12px 0;
    border: 1px solid var(--orange-01);
    border-radius: 8px;
  }

  .auth-warning ion-icon {
    color: var(--orange-01);
    margin-inline-end: 12px;
  }
</style>

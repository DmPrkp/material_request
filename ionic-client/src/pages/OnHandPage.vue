<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>{{ $t("pages.warehouses.on_hand.title") }}</ion-title>
      </ion-item-divider>

      <ion-text
        v-if="error"
        class="hint"
        color="danger"
      >
        {{ $t(error) }}
      </ion-text>

      <template v-else>
        <ion-item-group
          v-for="group in groups"
          :key="group.kind"
        >
          <ion-item-divider>
            <ion-label color="secondary">
              <h2>{{ $t(`pages.warehouses.kinds.${group.kind}`) }}</h2>
            </ion-label>
          </ion-item-divider>
          <!-- Только смотреть: вернуть и списать выданное может own/manage компании. -->
          <ion-item
            v-for="item in group.items"
            :key="item.id"
          >
            <ion-label class="ion-text-wrap">
              {{ item.title }}
              <p v-if="item.details">{{ item.details }}</p>
              <p
                v-if="item.company"
                class="company"
              >
                {{ item.company }}
              </p>
            </ion-label>
            <ion-note slot="end">
              {{ item.quantity }} {{ item.measure || $t("measure.pcs") }}
            </ion-note>
          </ion-item>
        </ion-item-group>

        <ion-note
          v-if="loaded && !groups.length"
          class="hint"
        >
          {{ $t("pages.warehouses.on_hand.empty") }}
        </ion-note>
      </template>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  /**
   * Что у меня на руках — одним списком из всех компаний, которые выдавали. Одна и та же
   * позиция от двух компаний — две строки: возвращать её разным компаниям. Чужие руки
   * здесь не видны: GET /holdings/mine отдаёт только свои.
   */
  import { IonNote } from "@ionic/vue";
  import { computed, ref, watch } from "vue";
  import {
    ITEM_KINDS,
    useItemLabels,
  } from "@/components/pagesParts/warehouses/itemLabels";
  import WarehouseModel from "@/models/WarehouseModel";
  import { useAuthStore } from "@/store/auth";
  import { useCompanyStore } from "@/store/company";
  import { tokenUser } from "@/store/authToken";
  import type { HoldingItem, WarehouseItemKind } from "@/types/dto";

  type HoldingRow = {
    id: number;
    kind: WarehouseItemKind;
    title: string;
    details: string;
    measure: string;
    quantity: number;
    company: string;
  };

  const authStore = useAuthStore();
  const companyStore = useCompanyStore();
  const { itemLabels } = useItemLabels();

  const rows = ref<HoldingRow[]>([]);
  const loaded = ref(false);
  const error = ref("");

  const groups = computed(() =>
    ITEM_KINDS.map((kind) => ({
      kind,
      items: rows.value.filter((row) => row.kind === kind),
    })).filter((group) => group.items.length)
  );

  async function load() {
    if (!authStore.isAuthenticated) {
      error.value = "pages.warehouses.auth_required";
      return;
    }
    loaded.value = false;
    error.value = "";

    const me = authStore.token ? tokenUser(authStore.token) : undefined;
    if (!companyStore.loaded) await companyStore.load(me?.id);

    const items = await WarehouseModel.holdingsMine();
    if (!items) {
      error.value = "pages.warehouses.on_hand.load_error";
      return;
    }
    // Руки живут только в компаниях, а показываем текущую — как и склады.
    const current = companyStore.currentId ?? null;
    const companyNames = new Map(
      companyStore.companies.map((company) => [company.id, company.name])
    );
    rows.value = await toRows(
      items.filter((item) => item.companyId === current),
      companyNames
    );
    loaded.value = true;
  }

  // Вошли, вышли или сменили компанию — другие руки.
  watch(
    () => [authStore.token, companyStore.currentId],
    () => void load(),
    { immediate: true }
  );

  async function toRows(
    items: HoldingItem[],
    companyNames: Map<number, string>
  ): Promise<HoldingRow[]> {
    const labels = await itemLabels(items);
    return items.map((item) => {
      const label = labels.get(item.id);
      return {
        id: item.id,
        kind: item.kind,
        title: label?.title ?? item.ref,
        details: label?.details ?? "",
        measure: label?.measure ?? "",
        quantity: item.quantity,
        company: companyNames.get(item.companyId) ?? "",
      };
    });
  }
</script>

<style scoped>
  .company {
    color: var(--ion-color-secondary);
  }

  .hint {
    display: block;
    padding: 16px;
    text-align: center;
  }
</style>

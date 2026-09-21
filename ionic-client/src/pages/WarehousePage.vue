<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>{{ warehouse?.name || $t("pages.warehouses.title") }}</ion-title>
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
          <ion-item
            v-for="item in group.items"
            :key="item.id"
          >
            <ion-label class="ion-text-wrap">
              {{ item.title }}
              <p v-if="item.details">{{ item.details }}</p>
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
          {{ $t("pages.warehouses.items_empty") }}
        </ion-note>
      </template>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  /**
   * Содержимое склада. Позиции названы ссылками (код сборки у материала и ручного
   * инструмента, id у электроинструмента) — названия и параметры добираем у словаря
   * теми же запросами, что нормы расхода. Не отдал словарь — показываем ссылку.
   */
  import { IonNote } from "@ionic/vue";
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute } from "vue-router";
  import { useParamLabel } from "@/components/pagesParts/catalog/paramLabel";
  import DictionaryModel from "@/models/DictionaryModel";
  import WarehouseModel from "@/models/WarehouseModel";
  import { useAuthStore } from "@/store/auth";
  import type {
    DictionaryVariantWithOwner,
    Warehouse,
    WarehouseItem,
    WarehouseItemKind,
  } from "@/types/dto";

  /** Порядок разделов — как в заявке: материалы, ручной, электро. */
  const KINDS: WarehouseItemKind[] = ["material", "hand_tool", "power_tool"];

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
  const { paramLabel, translate } = useParamLabel();

  const warehouse = ref<Warehouse>();
  const rows = ref<Record<WarehouseItemKind, ItemRow[]>>(emptyRows());
  const loaded = ref(false);
  const error = ref("");

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

  watch(() => [route.params.warehouse, authStore.token], load, {
    immediate: true,
  });

  async function withNames(items: WarehouseItem[]) {
    const refs = (kind: WarehouseItemKind) =>
      items.filter((item) => item.kind === kind).map((item) => item.ref);

    const [materials, handTools, powerTools] = await Promise.all([
      refs("material").length
        ? DictionaryModel.variantsByCodes("materials", refs("material"))
        : Promise.resolve([]),
      refs("hand_tool").length
        ? DictionaryModel.variantsByCodes("hand-tools", refs("hand_tool"))
        : Promise.resolve([]),
      refs("power_tool").length
        ? DictionaryModel.powerToolsByIds(refs("power_tool").map(Number))
        : Promise.resolve([]),
    ]);

    const byCode = new Map(
      [...(materials ?? []), ...(handTools ?? [])].map((variant) => [
        variant.code,
        variant,
      ])
    );
    const byId = new Map((powerTools ?? []).map((tool) => [String(tool.id), tool]));

    const result = emptyRows();
    for (const item of items) {
      const variant = byCode.get(item.ref);
      const tool = byId.get(item.ref);
      result[item.kind].push({
        id: item.id,
        // Сборки уже нет (удалили или переписали параметры — код стал другим):
        // позиция на складе осталась, показываем её по ссылке, как в нормах расхода.
        title:
          variant?.owner.name ??
          tool?.name ??
          t("pages.catalog.norms.unknown", { id: item.ref }),
        details: variant ? variantDetails(variant) : "",
        measure: variant?.owner.unit
          ? translate(
              `measure.${variant.owner.unit.code}`,
              variant.owner.unit.code
            )
          : "",
        quantity: item.quantity,
      });
    }
    return result;
  }

  function variantDetails(variant: DictionaryVariantWithOwner) {
    return variant.params.map(paramLabel).join(" ");
  }
</script>

<style scoped>
  .hint {
    display: block;
    padding: 16px;
    text-align: center;
  }
</style>

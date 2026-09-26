<template>
  <ion-page v-if="showPage">
    <ion-content>
      <ion-refresher
        slot="fixed"
        @ionRefresh="handleRefresh($event)"
      >
        <ion-refresher-content />
      </ion-refresher>
      <div class="ion-padding">
        <ion-item-divider>
          <ion-title>
            {{ $t("pages.materials.title") }}
          </ion-title>
        </ion-item-divider>
      </div>
      <MaterialList
        :components="components"
        :status="MATERIAL_LIST_STATUS.NEW"
        @update="(event: Event) => mergeMaterials(MATERIALS_KEYS.MATERIALS, event)"
      />
      <HandToolList
        :components="components"
        :status="MATERIAL_LIST_STATUS.NEW"
        @update="(event: Event) => mergeMaterials(MATERIALS_KEYS.HAND_TOOLS, event)"
      />
      <PowerToolList
        :components="components"
        :status="MATERIAL_LIST_STATUS.NEW"
        @update="(event: Event) => mergeMaterials(MATERIALS_KEYS.POWER_TOOLS, event)"
      />
      <MaterialActionPanel
        :materials="resultMatList"
        :ensure-saved="ensureSaved"
      />
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from "vue";
  import { LocationQuery, useRoute, useRouter } from "vue-router";
  import type { CalcResponseDTO, ResultMaterialsDTO } from "@/types/dto/index";
  import { alertController, RefresherCustomEvent } from "@ionic/vue";
  import { useI18n } from "vue-i18n";
  import BaseModel from "@/models/calc/BaseCalcModel";
  import MaterialActionPanel from "@/components/pagesParts/MaterialActionPanel.vue";
  import HandToolList from "@/components/pagesParts/handTools/HandToolList.vue";
  import PowerToolList from "@/components/pagesParts/powerTools/PowerToolList.vue";
  import { MATERIAL_LIST_STATUS } from "@/constants";
  import { usePreloader } from "@/store";
  import { useZayavkaAutosave } from "@/components/pagesParts/materials/useZayavkaAutosave";

  const MATERIALS_KEYS = {
    MATERIALS: "materials",
    HAND_TOOLS: "hand_tools",
    POWER_TOOLS: "power_tools",
  } as const;

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const preloader = usePreloader();
  const components = ref<CalcResponseDTO[]>([]);
  const resultMatList = ref<ResultMaterialsDTO>({
    hand_tools: [],
    power_tools: [],
    materials: [],
  });

  // Технологию фиксируем сразу: запись при уходе идёт, когда route уже другой.
  const system = String(route.params.system);

  /**
   * id заявки — в адресе: перезагрузка страницы продолжает ту же заявку, а не заводит
   * вторую. replace, а не push, — кнопка «назад» не должна ходить по черновикам.
   */
  const { ensureSaved } = useZayavkaAutosave(
    () => ({ ...resultMatList.value, system }),
    {
      initialId: Number(route.query.zayavka) || undefined,
      onCreated: (id) => {
        if (route.name !== "material-list") return;
        router.replace({ query: { ...route.query, zayavka: id } });
      },
    }
  );

  const showPage = computed(
    () => route.name === "material-list" && !preloader.state
  );

  preloader.setPreloader(true);

  function parseData(query: LocationQuery) {
    const { components, crew } = query;
    if (!components || typeof components !== "string") return {};
    return { components: JSON.parse(components), crew };
  }

  async function calculateValues() {
    const { system } = route.params;
    const { components, crew } = parseData(route.query);
    if (!components || !crew) return [];
    // crew из адреса — строка, а расчёт ждёт целое число звеньев.
    const dataToSend = { components, crew: Number(crew) };
    // Этапы приходят в порядке слоёв технологии — не пересортировываем по id.
    return (
      (await BaseModel.post<CalcResponseDTO[]>({
        params: `/calc/${system}`,
        body: dataToSend,
      })) || []
    );
  }

  /**
   * Упавший расчёт не должен вешать страницу: без этого прелоадер так и оставался
   * включённым. Показываем ошибку и пустые списки — пользователь может потянуть
   * refresher или вернуться к форме.
   */
  async function safeCalculate(): Promise<CalcResponseDTO[]> {
    try {
      return await calculateValues();
    } catch (error) {
      console.error(error);
      const alert = await alertController.create({
        header: t("pages.materials.calc_error"),
        buttons: [t("ui.buttons.close")],
      });
      await alert.present();
      return [];
    }
  }

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    const values = await safeCalculate();
    components.value = [...values];
    event.target.complete();
  }

  function mergeMaterials(
    material: (typeof MATERIALS_KEYS)[keyof typeof MATERIALS_KEYS],
    event: Event
  ) {
    resultMatList.value = Object.assign({}, resultMatList.value, {
      [material]: event,
    });
  }

  onMounted(async () => {
    const values = await safeCalculate();
    components.value = values;
    preloader.setPreloader(false);
  });
</script>

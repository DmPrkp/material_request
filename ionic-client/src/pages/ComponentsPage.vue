<template>
  <ion-page v-if="route.name === 'system'">
    <ion-content>
      <ion-refresher
        slot="fixed"
        @ionRefresh="handleRefresh($event)"
      >
        <ion-refresher-content />
      </ion-refresher>
      <!--
        Не ion-item-divider + ion-title, как на других страницах: там заголовок — пара
        слов, а здесь полное описание технологии из словаря («Системы фасадные
        теплоизоляционные…») в несколько строк. У ion-title свой отступ слева и
        крупный кегль — описание съезжало от полей и занимало пол-экрана.
        h1 — описание, а не короткое имя: по нему страницу и ищут.
      -->
      <header class="technology_header">
        <h1>
          {{ systemDescription || systemName || $t("pages.materials.title") }}
        </h1>
        <!-- Что значат цифры расчёта: у материалов — на объём, у инструмента — на звено. -->
        <p>
          {{ $t("pages.catalog.norms.hint_materials", { unit: unitText }) }}
          {{ $t("pages.catalog.norms.hint_tools") }}
        </p>
      </header>
      <div class="full-volume-block">
        <ion-input
          class="full-volume-block_input"
          :disabled="!isValueToAll"
          :label="
            isValueToAll
              ? `${$t('pages.components.total-volume')}:`
              : $t('pages.components.by-layers')
          "
          placeholder="_________"
          :value="allValue"
          type="number"
          @ionInput="setAllValue"
        />
        <ion-text>{{ unitText }}</ion-text>
      </div>
      <ion-list>
        <ion-item
          v-for="stage in stages"
          :key="stage.id"
          class="custom-item"
        >
          <!-- name уже на языке страницы: этапы — данные словаря, i18n их не переводит. -->
          <ion-label>
            {{ stage.name }}
          </ion-label>
          <ion-input
            @ionInput="setVal($event, stage.id)"
            type="number"
            :value="volumes[stage.id]"
          />
          <ion-text justify="end">{{ unitText }}</ion-text>
        </ion-item>
      </ion-list>
      <ion-item>
        <ion-label>
          {{ $t(`pages.components.crew-num`) + ":" }}
        </ion-label>
        <ion-input
          :disabled="!isValueToAll"
          placeholder="_______"
          type="number"
          :value="crew"
          @ionInput="setWorkerCrew"
        />
      </ion-item>
      <div class="ion-padding">
        <!-- <ion-button
          expand="full"
          @click="sendComponentsVal"
          >{{ $t("pages.components.send") }}</ion-button
        > -->
        <CutCornerBtn
          fullWidth
          @click="sendComponentsVal"
        >
          {{ $t("pages.components.send") }}
        </CutCornerBtn>
      </div>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import {
    InputCustomEvent,
    RefresherCustomEvent,
    // ToggleCustomEvent,
  } from "@ionic/vue";
  import { usePreloader } from "@/store";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import DictionaryModel from "@/models/DictionaryModel";
  import type { DictionaryUnit, DictionaryWorkStage } from "@/types/dto";
  import { useUnitLabel } from "@/components/pagesParts/catalog/unitLabel";

  const route = useRoute();
  const router = useRouter();
  const preloader = usePreloader();
  preloader.setPreloader(true);

  /** Этапы технологии по порядку слоёв — из словаря, как и сама технология. */
  const stages = ref<DictionaryWorkStage[]>([]);
  /** Объём по id этапа: title у пользовательских этапов — сгенерированный код, ключом он не годится. */
  const volumes: Record<number, number> = reactive({});
  const isValueToAll = ref(true);
  const allValue = ref(100);
  const crew = ref(1);

  const { t, locale } = useI18n({ useScope: "global" });
  const unitLabel = useUnitLabel();
  /** Единица объёма технологии из словаря (Технологии работ → форма). */
  const unit = ref<DictionaryUnit | null>(null);
  const systemName = ref("");
  const systemDescription = ref<string | null>(null);
  // Словарь не ответил — «м²», как было до выбора единицы в технологии.
  const unitText = computed(() =>
    unit.value ? unitLabel(unit.value) : t("measure.square"),
  );

  /**
   * Технология по коду из адреса, потом её этапы. Раньше этапы отдавал calc-server
   * (GET /:workType/:system), но структура переехала в словарь, а calc-server хранит
   * только нормы и формулу. Не видна технология или словарь молчит — этапов нет.
   */
  async function load() {
    const { system } = route.params;
    if (typeof system !== "string") return;
    try {
      const found = await DictionaryModel.systemByTitle(system);
      unit.value = found?.unit ?? null;
      systemName.value = found?.name ?? "";
      systemDescription.value = found?.description ?? null;
      stages.value = found
        ? ((await DictionaryModel.systemStages(found.id)) ?? [])
        : [];
      // При смене языка этапы те же — введённые объёмы не сбрасываем.
      stages.value.forEach((stage) => {
        volumes[stage.id] ??= allValue.value;
      });
      if (!stages.value.length) {
        console.warn("No components available for this system.");
      }
    } finally {
      preloader.setPreloader(false);
    }
  }

  function setAllValue(value: InputCustomEvent) {
    const val = Number(value.detail.value || 0);
    allValue.value = val > 9999 ? 9999 : val;
    stages.value.forEach((stage) => (volumes[stage.id] = allValue.value));
  }

  function setWorkerCrew(value: InputCustomEvent) {
    crew.value = Number(value.detail.value || 1);
  }

  function setVal(value: InputCustomEvent, stageId: number) {
    volumes[stageId] = Number(value.detail.value || 0);
  }

  watch([() => route.params.system, locale], () => void load(), {
    immediate: true,
  });

  function sendComponentsVal() {
    const components = Object.fromEntries(
      stages.value.map((stage) => [String(stage.id), volumes[stage.id] ?? 0]),
    );

    router.push({
      name: "material-list",
      query: { components: JSON.stringify(components), crew: crew.value },
    });
  }

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    await load();
    event.target.complete();
  }
</script>

<style>
  /* Левый край — как у полей ниже (16px), кегль умеренный: описание в 2–3 строки. */
  .technology_header {
    padding: 16px 16px 8px;
  }

  .technology_header h1 {
    margin: 0 0 6px;
    font-size: 1.25rem;
    line-height: 1.25;
  }

  /* Приглушено, как примечания на странице норм: --ion-color-medium на тёмной
     теме почти сливается с фоном. */
  .technology_header p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.35;
    color: rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.6);
  }

  .full-volume-block {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0 15px 0 15px;
  }

  .full-volume-block_input {
    flex: 1;
    --placeholder-width: 150px;
  }

  .custom-item {
    display: flex;
    align-items: center;
  }

  ion-label {
    flex: 1; /* Take available space */
    min-width: 250px; /* Minimum width of label */
    white-space: nowrap; /* Prevent text wrapping */
    overflow: hidden; /* Hide overflow text */
    text-overflow: ellipsis; /* Add ellipsis for overflow text */
  }

  ion-input {
    flex: 2; /* Adjust based on your layout needs */
  }
</style>

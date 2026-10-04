<template>
  <ion-page v-if="route.name === 'system'">
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>
      <!--
        Не ion-item-divider + ion-title, как на других страницах: там заголовок — пара
        слов, а здесь заголовок и описание в несколько строк. У ion-title свой отступ
        слева и крупный кегль — текст съезжал от полей и занимал пол-экрана.
        h1 — заголовок из seoPages, если он у технологии есть: тот же стоит в HTML
        сборки (seo-prerender.ts), и робот, исполнивший JS, не должен увидеть другой.
        Описание из словаря («Системы фасадные теплоизоляционные…») — строкой под ним.
      -->
      <header class="technology_header">
        <h1>{{ heading }}</h1>
        <p v-if="seoTitle && systemDescription" class="technology_header_lead">
          {{ systemDescription }}
        </p>
        <!-- Что значат цифры расчёта: у материалов — на объём, у инструмента — на звено. -->
        <p>
          {{ $t("pages.catalog.norms.hint_materials", { unit: unitText }) }}
          {{ $t("pages.catalog.norms.hint_tools") }}
        </p>
      </header>
      <!--
        Параметры технологии: от них зависит типоразмер в расчёте — у перегородки
        это ширина профиля, то есть её толщина. Список даёт calc-server: какие
        варианты есть, знают нормы. Технология без параметров ничего не показывает.
      -->
      <ion-item
        v-for="group in optionGroups"
        :key="group.kind"
        class="custom-item"
      >
        <ion-select
          :label="groupLabel(group)"
          :value="chosen[group.kind]"
          interface="popover"
          @ionChange="setOption(group.kind, $event)"
        >
          <ion-select-option
            v-for="option in group.options"
            :key="option.id"
            :value="option.id"
          >
            {{ optionLabel(option) }}
          </ion-select-option>
        </ion-select>
      </ion-item>
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
          min="0"
          :max="MAX_VALUE"
          @ionInput="setAllValue"
        />
        <ion-text>{{ unitText }}</ion-text>
      </div>
      <h2 v-if="stages.length" class="technology_stages_title">
        {{ $t("pages.components.stages") }}
      </h2>
      <ion-list>
        <ion-item v-for="stage in stages" :key="stage.id" class="custom-item">
          <!-- name уже на языке страницы: этапы — данные словаря, i18n их не переводит. -->
          <ion-label>
            {{ stage.name }}
          </ion-label>
          <ion-input
            @ionInput="setVal($event, stage.id)"
            type="number"
            min="0"
            :max="MAX_VALUE"
            :value="volumes[stage.id]"
          />
          <ion-text justify="end">{{ unitText }}</ion-text>
        </ion-item>
      </ion-list>
      <ion-item class="crew-item">
        <ion-label>
          {{ $t(`pages.components.crew-num`) + ":" }}
        </ion-label>
        <ion-input
          :disabled="!isValueToAll"
          placeholder="_______"
          type="number"
          min="0"
          :max="MAX_VALUE"
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
        <PlasmaButton fullWidth @click="sendComponentsVal">
          {{ $t("pages.components.send") }}
        </PlasmaButton>
      </div>
      <TechnologyText :text="systemArticle" />
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
    SelectCustomEvent,
    // ToggleCustomEvent,
  } from "@ionic/vue";
  import { usePreloader } from "@/store";
  import PlasmaButton from "@/components/ui/PlasmaButton.vue";
  import TechnologyText from "@/components/pagesParts/technology/TechnologyText.vue";
  import { CALCULATOR_KEY, seoPages } from "@/router/constants";
  import type { Locale } from "@/types";
  import CalcModel from "@/models/calc/CalcModel";
  import DictionaryModel from "@/models/DictionaryModel";
  import type {
    CalcOption,
    DictionaryUnit,
    DictionaryWorkStage,
  } from "@/types/dto";
  import { useParamLabel } from "@/components/pagesParts/catalog/paramLabel";
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

  /** Параметры расчёта технологии и выбранное значение по виду параметра. */
  const options = ref<CalcOption[]>([]);
  const chosen = reactive<Record<string, number>>({});

  const { t, locale } = useI18n({ useScope: "global" });
  const unitLabel = useUnitLabel();
  const { translate, calcParamLabel } = useParamLabel();
  /** Единица объёма технологии из словаря (Технологии работ → форма). */
  const unit = ref<DictionaryUnit | null>(null);
  const systemName = ref("");
  const systemDescription = ref<string | null>(null);
  /** Текст страницы технологии из словаря — под калькулятором (TechnologyText). */
  const systemArticle = ref<string | null>(null);
  /** Заголовок технологии из seoPages — только по точному адресу, без предка. */
  const seoTitle = computed(() => {
    const { workType, system } = route.params;
    const seo = seoPages[`${CALCULATOR_KEY}/${workType}/${system}`];
    return seo?.title[locale.value as Locale] ?? null;
  });
  const heading = computed(
    () =>
      seoTitle.value ||
      systemDescription.value ||
      systemName.value ||
      t("pages.materials.title"),
  );
  // Словарь не ответил — «м²», как было до выбора единицы в технологии.
  const unitText = computed(() =>
    unit.value ? unitLabel(unit.value) : t("measure.square"),
  );

  /**
   * Параметры одного вида — один выпадающий список: толщина и уклон не должны
   * оказаться в общем перечне. Вид приходит кодом (width), как и у параметров сборки.
   */
  const optionGroups = computed(() => {
    const groups = new Map<string, { kind: string; options: CalcOption[] }>();
    options.value.forEach((option) => {
      const kind = option.title ?? "";
      const group = groups.get(kind) ?? { kind, options: [] };
      group.options.push(option);
      groups.set(kind, group);
    });
    return [...groups.values()];
  });

  /** Подпись списка — вид параметра словом: «Ширина». Нет перевода — короткая форма. */
  function groupLabel(group: { kind: string }): string {
    return translate(
      `ui.paramKinds.${group.kind}`,
      translate(`ui.paramsTitles.${group.kind}`, group.kind),
    );
  }

  /** В списке — только число с единицей: вид уже в подписи самого списка. */
  function optionLabel(option: CalcOption): string {
    return calcParamLabel({ ...option, title: undefined });
  }

  function setOption(kind: string, event: SelectCustomEvent) {
    chosen[kind] = Number(event.detail.value);
  }

  /**
   * Параметры технологии — после этапов: calc-server спрашивают по их id.
   * Выбранное сбрасываем на первое значение — оно же базовое и на сервере.
   */
  async function loadOptions(system: string, stageIds: number[]) {
    options.value = (await CalcModel.options(system, stageIds)) ?? [];
    Object.keys(chosen).forEach((kind) => delete chosen[kind]);
    optionGroups.value.forEach((group) => {
      chosen[group.kind] = group.options[0].id;
    });
  }

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
      systemArticle.value = found?.article ?? null;
      stages.value = found
        ? ((await DictionaryModel.systemStages(found.id)) ?? [])
        : [];
      // При смене языка этапы те же — введённые объёмы не сбрасываем.
      stages.value.forEach((stage) => {
        volumes[stage.id] ??= allValue.value;
      });
      await loadOptions(
        system,
        stages.value.map((stage) => stage.id),
      );
      if (!stages.value.length) {
        console.warn("No components available for this system.");
      }
    } finally {
      preloader.setPreloader(false);
    }
  }

  /** Потолок один на все поля страницы: в них не вводят больше четырёх знаков. */
  const MAX_VALUE = 9999;

  /**
   * Обрезка введённого по [0, MAX_VALUE] — и обязательно обратно в само поле.
   * Обрезать только модель мало: если обрезанное совпало с прежним значением,
   * Vue поле не перерисует, и на экране останется набранное пятизначное число,
   * пока расчёт молча уйдёт с другим. Ровно так и вёл себя «Общий объём».
   *
   * Дробные не трогаем — объём бывает и 12.5. Пустое поле и мусор вроде «-» дают
   * запасное значение, а не NaN: NaN ушёл бы в расчёт и всплыл уже в материалах.
   */
  function limitValue(event: InputCustomEvent, whenEmpty: number): number {
    const raw = String(event.detail.value ?? "");
    if (raw === "") return whenEmpty;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return whenEmpty;

    const limited = Math.min(Math.max(parsed, 0), MAX_VALUE);
    if (String(limited) !== raw) {
      event.target.value = limited;
    }
    return limited;
  }

  function setAllValue(value: InputCustomEvent) {
    allValue.value = limitValue(value, 0);
    stages.value.forEach((stage) => (volumes[stage.id] = allValue.value));
  }

  function setWorkerCrew(value: InputCustomEvent) {
    crew.value = limitValue(value, 1);
  }

  function setVal(value: InputCustomEvent, stageId: number) {
    volumes[stageId] = limitValue(value, 0);
  }

  watch([() => route.params.system, locale], () => void load(), {
    immediate: true,
  });

  function sendComponentsVal() {
    const components = Object.fromEntries(
      stages.value.map((stage) => [String(stage.id), volumes[stage.id] ?? 0]),
    );

    const selected = Object.values(chosen);

    router.push({
      name: "material-list",
      query: {
        components: JSON.stringify(components),
        crew: crew.value,
        // Только когда есть что выбирать: иначе в ссылке висел бы пустой параметр.
        ...(selected.length ? { options: selected.join(",") } : {}),
      },
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

  .technology_header .technology_header_lead {
    margin: 0 0 6px;
    font-size: 0.95rem;
    color: inherit;
  }

  /* Приглушено, как примечания на странице норм: --ion-color-medium на тёмной
     теме почти сливается с фоном. */
  .technology_header p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.35;
    color: rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.6);
  }

  /* Подпись списка этапов — мельче h1 и без своего фона: это шапка полей ниже. */
  .technology_stages_title {
    margin: 16px 16px 0;
    font-size: 1rem;
    line-height: 1.3;
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
    /* Тот же зазор до «м²», что и у строк ниже: иначе цифра липнет к размерности. */
    --padding-end: 6px;
  }

  .custom-item {
    display: flex;
    align-items: center;
  }

  /*
   * Цифру держим справа, вплотную к размерности: объёмы сравнивают между собой
   * по колонке, а посреди строки они прыгали вслед за длиной названия слоя.
   * Ширина — ровно под 9999 (в поле больше и не вводят) плюс место каретке,
   * остальное забирает название. min-width ниже (общее правило для ion-label)
   * распирал строку на 250px и не давал названию ужаться.
   */
  .custom-item ion-label {
    flex: 1 1 auto;
    min-width: 0;
  }

  .custom-item ion-input {
    flex: 0 0 auto;
    width: calc(4ch + 12px);
    text-align: end;
    --padding-end: 6px;
  }

  .custom-item ion-input .native-input,
  .full-volume-block_input .native-input {
    text-align: end;
  }

  /*
   * Стрелки type="number" в Chrome вылезают поверх цифр, как только поле сузили
   * до четырёх знаков — и накрывают собой последнюю.
   */
  .custom-item ion-input .native-input::-webkit-outer-spin-button,
  .custom-item ion-input .native-input::-webkit-inner-spin-button,
  .full-volume-block_input .native-input::-webkit-outer-spin-button,
  .full-volume-block_input .native-input::-webkit-inner-spin-button {
    margin: 0;
    -webkit-appearance: none;
  }

  /*
   * Ниже было голыми ion-label/ion-input. Стили SFC глобальны (блок не scoped, а
   * scoped и не годится: правила для .native-input внутри ion-input рисует Ionic,
   * data-v на нём нет), поэтому после первого захода в калькулятор min-width и
   * многоточие доставались всем ion-label приложения — склады, «на руках»,
   * настройки — и жили до перезагрузки. Привязываем к своим строкам.
   */
  .custom-item ion-label,
  .crew-item ion-label {
    /* Название слоя в одну строку: перенос уводил цифру объёма от размерности. */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .crew-item ion-label {
    flex: 1;
    min-width: 250px;
  }

  .crew-item ion-input {
    flex: 2;
  }
</style>

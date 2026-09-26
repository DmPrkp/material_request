<template>
  <ion-page v-if="route.name === 'zaiavka-list'">
    <ion-content :class="{ 'with-bulk-bar': editing && selected.size }">
      <ion-refresher
        slot="fixed"
        @ionRefresh="handleRefresh($event)"
      >
        <ion-refresher-content />
      </ion-refresher>
      <div class="ion-padding">
        <ion-item-divider>
          <ion-title>
            {{ $t("pages.zaiavka_list.title") }}
          </ion-title>
        </ion-item-divider>
      </div>
      <!-- Калькулятор — начало новой заявки: расчёт сам сохраняется и появится здесь. -->
      <ion-row class="new-zaiavka ion-justify-content-between ion-align-items-center ion-padding-horizontal">
        <!-- Режим правки: вместо времени — чекбоксы, строка не открывает заявку, а выделяется. -->
        <CutCornerBtn
          v-if="rows.length"
          @click="toggleEditing"
        >
          {{ $t(editing ? "pages.zaiavka_list.done" : "pages.zaiavka_list.edit") }}
        </CutCornerBtn>
        <span v-else />
        <CutCornerBtn @click="router.push({ name: 'calculator' })">
          {{ $t("pages.zaiavka_list.new") }}
        </CutCornerBtn>
      </ion-row>
      <!-- Без входа заявки ничьи: почистят данные сайта — список их больше не найдёт. -->
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
          {{ $t("pages.zaiavka_list.auth_warning") }}
        </ion-label>
      </ion-item>
      <!-- Шапка столбцов — как в самой заявке: одна на весь список, над группами. -->
      <ion-row class="table-header">
        <ion-col class="col-num"> № </ion-col>

        <ion-col class="col-system">
          {{ $t("pages.zaiavka_list.table.system") }}
        </ion-col>

        <ion-col class="col-volume">
          {{ $t("pages.zaiavka_list.table.volume") }}
        </ion-col>

        <ion-col
          v-if="editing"
          class="col-time col-check"
          @click="toggleAll"
        >
          <IonIcon
            :icon="allSelected ? checkbox : squareOutline"
            :color="allSelected ? 'primary' : undefined"
            role="checkbox"
            :aria-checked="allSelected"
            :aria-label="$t('pages.zaiavka_list.select_all')"
          />
        </ion-col>
        <ion-col
          v-else
          class="col-time"
        >
          {{ $t("pages.zaiavka_list.table.time") }}
        </ion-col>
      </ion-row>
      <!-- Год — полосой, как разделы заявки; день — подзаголовком, как этапы работ. -->
      <template
        v-for="year in groups"
        :key="year.year"
      >
        <TitledDivider :title="String(year.year)" />
        <ion-item-group
          v-for="day in year.days"
          :key="day.key"
        >
          <ion-item-divider>
            <ion-label color="secondary">
              <h2>{{ day.label }}</h2>
            </ion-label>
          </ion-item-divider>
          <ion-item
            v-for="zaiavka in day.items"
            :key="zaiavka.id"
            class="zaiavka-row"
            :class="{ selected: editing && selected.has(zaiavka.id) }"
            button
            :detail="false"
            @click="onRowClick(zaiavka.id)"
          >
            <ion-grid>
              <ion-row>
                <ion-col class="col-num">{{ zaiavka.id }}</ion-col>

                <!-- Своё имя (у объединённой) важнее технологии: их там может быть несколько. -->
                <ion-col class="col-system">
                  {{ zaiavka.name || systemLabel(zaiavka.system) }}
                </ion-col>

                <ion-col class="col-volume">
                  {{ volumeLabel(zaiavka) }}
                </ion-col>

                <ion-col
                  v-if="editing"
                  class="col-time col-check"
                >
                  <IonIcon
                    :icon="selected.has(zaiavka.id) ? checkbox : squareOutline"
                    :color="selected.has(zaiavka.id) ? 'primary' : undefined"
                    role="checkbox"
                    :aria-checked="selected.has(zaiavka.id)"
                    :aria-label="String(zaiavka.id)"
                  />
                </ion-col>
                <ion-col
                  v-else
                  class="col-time"
                >
                  <ion-note>{{ formatTime(zaiavka.createdAt) }}</ion-note>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-item>
        </ion-item-group>
      </template>
      <!--
        Групповые операции — прибиты к низу экрана, под большой палец: список длинный,
        и кнопки наверху уезжали бы вместе с ним.
      -->
      <div
        v-if="editing && selected.size"
        slot="fixed"
        class="bulk-bar"
      >
        <ion-button
          color="danger"
          fill="outline"
          :disabled="busy"
          @click="removeSelected"
        >
          {{ $t("pages.zaiavka_list.delete", { count: selected.size }) }}
        </ion-button>
        <ion-button
          fill="outline"
          :disabled="busy || selected.size < 2"
          @click="mergeSelected"
        >
          {{ $t("pages.zaiavka_list.merge") }}
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import Zaiavka from "@/models/zaiavka";
  import {
    addKey,
    findKey,
    listKeys,
    removeKeys,
  } from "@/models/zaiavka/anonymousKeys";
  import { mergeZaiavki } from "@/models/zaiavka/mergeZaiavki";
  import { claimAnonymous } from "@/models/zaiavka/claimAnonymous";
  import DictionaryModel from "@/models/DictionaryModel";
  import { useAuthStore } from "@/store/auth";
  import { useZaiavkaStore } from "@/store/zaiavka";
  import {
    DictionarySystem,
    MaterialRequestDTO,
    StoredMaterialRequestDTO,
  } from "@/types/dto";
  import { ZaiavkaType } from "@/types/entity/zaiavka";
  import { useUnitLabel } from "@/components/pagesParts/catalog/unitLabel";
  import {
    alertController,
    IonIcon,
    IonItemGroup,
    IonNote,
    IonRow,
    RefresherCustomEvent,
    toastController,
  } from "@ionic/vue";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import TitledDivider from "@/components/ui/TitledDivider.vue";
  import { alertCircle, checkbox, squareOutline } from "ionicons/icons";
  import { computed, onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";

  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const zaiavkaStore = useZaiavkaStore();
  const unitLabel = useUnitLabel();
  const { t } = useI18n({ useScope: "global" });

  const pad = (n: number) => String(n).padStart(2, "0");

  function formatTime(date: string) {
    const d = new Date(date);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** Строка списка: сама заявка разобрана заранее, чтобы не парсить JSON на каждый рендер. */
  type ZaiavkaRow = {
    id: number;
    createdAt: string;
    /** Технический код технологии (EIFS, frame_scaffold); пустой — заявка без него. */
    system: string;
    name?: string;
    volume?: number;
    /** Разобранная заявка целиком — из неё собирается объединённая. */
    data?: ZaiavkaType;
  };

  type DayGroup = { key: string; label: string; items: ZaiavkaRow[] };
  type YearGroup = { year: number; days: DayGroup[] };

  /** data приходит строкой JSON — той же, что записал расчёт; битую просто пропускаем. */
  function parseData(raw: string): ZaiavkaType | undefined {
    try {
      return JSON.parse(raw) as ZaiavkaType;
    } catch {
      return undefined;
    }
  }

  /**
   * Объём работ — наибольший по этапам: в калькуляторе объём можно задать каждому
   * слою отдельно, а в списке нужна одна цифра, и общая как раз наибольшая.
   */
  function totalVolume(data?: ZaiavkaType): number | undefined {
    let max = 0;
    for (const stage of data?.materials ?? []) {
      for (const material of stage.materials ?? []) {
        if (Number.isFinite(material.volume) && material.volume > max) {
          max = material.volume;
        }
      }
    }
    return max || undefined;
  }

  const rows = computed<ZaiavkaRow[]>(() =>
    materialRequests.value.map((zaiavka) => {
      const data = parseData(zaiavka.data);
      return {
        id: zaiavka.id,
        createdAt: zaiavka.createdAt,
        system: data?.system ?? "",
        name: data?.name,
        volume: totalVolume(data),
        data,
      };
    })
  );

  /**
   * Технологии по коду из заявки: в списке показываем название на языке страницы,
   * а не код, и подписываем объём её единицей. Не ответил словарь — остаётся код.
   */
  const systems = ref(new Map<string, DictionarySystem>());

  async function loadSystems() {
    const titles = [...new Set(rows.value.map((row) => row.system))].filter(
      (title) => title && !systems.value.has(title)
    );
    const found = await Promise.all(
      titles.map(async (title) =>
        [title, await DictionaryModel.systemByTitle(title)] as const
      )
    );
    const next = new Map(systems.value);
    for (const [title, system] of found) if (system) next.set(title, system);
    systems.value = next;
  }

  function systemLabel(title: string) {
    return systems.value.get(title)?.name || title || "—";
  }

  function volumeLabel(row: ZaiavkaRow) {
    if (row.volume === undefined) return "—";
    const unit = systems.value.get(row.system)?.unit;
    // Единицу дописываем только когда знаем её: в списке рядом технологии с разными.
    return unit ? `${row.volume} ${unitLabel(unit)}` : String(row.volume);
  }

  /**
   * Заявки по годам и дням, по местному времени. Порядок — как пришёл список
   * (новые сверху), группы идут в том же порядке. Месяц — «сентябрь 19»: month:
   * "long" без дня даёт именительный падеж, «сентября» было бы с днём.
   */
  const groups = computed<YearGroup[]>(() => {
    const years: YearGroup[] = [];
    for (const zaiavka of rows.value) {
      const d = new Date(zaiavka.createdAt);
      const year = d.getFullYear();
      const key = `${year}-${d.getMonth()}-${d.getDate()}`;

      let yearGroup = years.find((y) => y.year === year);
      if (!yearGroup) years.push((yearGroup = { year, days: [] }));

      let day = yearGroup.days.find((g) => g.key === key);
      if (!day) {
        const month = d.toLocaleString(String(route.params.locale), {
          month: "long",
        });
        day = { key, label: `${month} ${pad(d.getDate())}`, items: [] };
        yearGroup.days.push(day);
      }
      day.items.push(zaiavka);
    }
    return years;
  });

  function openItem(id: StoredMaterialRequestDTO["id"]) {
    router.push({ name: "zaiavka", params: { zaiavka: id } });
  }

  /** Режим правки списка: выделение и групповые операции над выделенным. */
  const editing = ref(false);
  const selected = ref(new Set<number>());
  const busy = ref(false);

  const allSelected = computed(
    () => rows.value.length > 0 && selected.value.size === rows.value.length
  );

  function toggleEditing() {
    editing.value = !editing.value;
    selected.value = new Set();
  }

  /**
   * В режиме правки строка целиком — переключатель: по чекбоксу на телефоне не
   * попасть. Чекбокс — иконка, а не ion-checkbox: тот внутри ion-item становится
   * вводом строки, получает её клик и переключал бы выделение второй раз.
   */
  function onRowClick(id: number) {
    if (!editing.value) return openItem(id);
    const next = new Set(selected.value);
    if (!next.delete(id)) next.add(id);
    selected.value = next;
  }

  function toggleAll() {
    selected.value = allSelected.value
      ? new Set()
      : new Set(rows.value.map((row) => row.id));
  }

  async function removeSelected() {
    const ids = [...selected.value];
    const alert = await alertController.create({
      header: t("pages.zaiavka_list.delete_confirm.header", {
        count: ids.length,
      }),
      message: t("pages.zaiavka_list.delete_confirm.message"),
      buttons: [
        { text: t("ui.buttons.cancel"), role: "cancel" },
        { text: t("ui.buttons.remove"), role: "destructive" },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== "destructive") return;

    busy.value = true;
    try {
      const removed = await deleteZaiavki(ids);
      // Неудавшиеся остаются выделенными — можно повторить.
      selected.value = new Set(ids.filter((id) => !removed.includes(id)));
      await load();
    } finally {
      busy.value = false;
    }
  }

  /**
   * Удаление без вопросов — спрашивают вызывающие. По одной: у ничьих заявок у каждой
   * свой ключ правки, одного запроса на всех нет. Отвечает id удалённых; о тех, что
   * не удались, говорит сама.
   */
  async function deleteZaiavki(ids: number[]): Promise<number[]> {
    const results = await Promise.allSettled(
      ids.map((id) => Zaiavka.remove(id, findKey(id)))
    );
    const removed = ids.filter((_, i) => results[i].status === "fulfilled");
    const failed = ids.length - removed.length;

    removeKeys(removed);
    zaiavkaStore.removeMaterialRequests(removed);
    if (failed) {
      console.error("Не удалось удалить заявки", results);
      await notify(t("pages.zaiavka_list.delete_error", { count: failed }));
    }
    return removed;
  }

  /**
   * Объединение: имя обязательно — у новой заявки несколько технологий, и без имени
   * в списке её не отличить. Сами правила слияния — mergeZaiavki.
   *
   * Исходные удаляем только после того, как новая сохранилась: упади создание —
   * данные не должны пропасть. Не удалилась какая-то из исходных — новая всё равно
   * есть, о неудаче скажет deleteZaiavki, а оставшаяся будет видна в списке.
   */
  async function mergeSelected() {
    const sources = rows.value.filter(
      (row) => selected.value.has(row.id) && row.data
    );
    if (sources.length < 2) return;

    const name = await askMergeName();
    if (!name) return;

    busy.value = true;
    try {
      const data = mergeZaiavki(
        sources.map((row) => ({ id: row.id, data: row.data as ZaiavkaType })),
        name
      );
      let created: Awaited<ReturnType<Zaiavka["create"]>>;
      try {
        created = await new Zaiavka(data).create();
      } catch (error) {
        console.error("Не удалось объединить заявки", error);
        await notify(t("pages.zaiavka_list.merge_error"));
        return;
      }
      // Без входа новая заявка ничья, как и исходные: её ключ правки — только здесь.
      if (created.key) addKey(created.id, created.key);

      await deleteZaiavki(sources.map((row) => row.id));
      openItem(created.id);
    } finally {
      busy.value = false;
    }
  }

  /** Имя новой заявки; пустое не пускаем — окно остаётся открытым. Отмена — undefined. */
  async function askMergeName(): Promise<string | undefined> {
    const alert = await alertController.create({
      header: t("pages.zaiavka_list.merge_name.header", {
        count: selected.value.size,
      }),
      message: t("pages.zaiavka_list.merge_name.message"),
      inputs: [
        {
          name: "name",
          type: "text",
          placeholder: t("pages.zaiavka_list.merge_name.placeholder"),
          attributes: { maxlength: 100 },
        },
      ],
      buttons: [
        { text: t("ui.buttons.cancel"), role: "cancel" },
        {
          text: t("pages.zaiavka_list.merge"),
          role: "confirm",
          handler: (values: { name?: string }) => Boolean(values.name?.trim()),
        },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{
      values: { name?: string };
    }>();
    return role === "confirm" ? data?.values.name?.trim() : undefined;
  }

  async function notify(message: string) {
    const toast = await toastController.create({ message, duration: 2500 });
    await toast.present();
  }

  function goToAuth() {
    router.push({ name: "auth", query: { redirect: route.fullPath } });
  }

  const materialRequests = ref<MaterialRequestDTO[]>([]);

  /**
   * Каждый раз заново, без кэша стора: заявки пишутся автосохранением в фоне,
   * и кэш показывал бы список на момент первого открытия. Со входом — свои;
   * без входа — ничьи по id, которые помнит этот браузер.
   */
  async function load() {
    if (authStore.isAuthenticated) {
      // Вошли, а перенос ещё идёт — дождёмся, иначе только что забранные не попадут в список.
      await claimAnonymous();
      materialRequests.value = await Zaiavka.findAll();
    } else {
      materialRequests.value = await Zaiavka.findByIds(
        listKeys().map((item) => item.id)
      );
    }
    await loadSystems();
  }

  onMounted(load);

  // Страница-родитель остаётся смонтированной под открытой заявкой и в стеке Ionic —
  // перечитываем, когда на неё вернулись, и когда вошли или вышли.
  watch(
    () => route.name,
    (name) => {
      if (name === "zaiavka-list") void load();
      // Ушли в заявку или калькулятор — режим правки не тащим обратно.
      else if (editing.value) toggleEditing();
    }
  );
  watch(() => authStore.token, () => void load());

  // Названия технологий и единицы приходят на языке запроса — при смене языка
  // кэш сбрасываем и берём их заново; сами заявки от языка не зависят.
  watch(
    () => route.params.locale,
    () => {
      systems.value = new Map();
      void loadSystems();
    }
  );

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    await load();
    event.target.complete();
  }
</script>

<style scoped>
  .new-zaiavka {
    margin-bottom: 12px;
  }

  .col-check ion-icon {
    font-size: 20px;
    vertical-align: middle;
  }

  .table-header .col-check {
    cursor: pointer;
  }

  .zaiavka-row.selected {
    --background: rgba(var(--ion-color-primary-rgb), 0.12);
  }

  /* Столько же, сколько у строк ниже (--padding-start у ion-item): иначе шапка
     разъезжается со столбцами. Отступ узкий — на телефоне четыре столбца и так впритык. */
  .table-header {
    padding: 0 8px;
  }

  /* ion-item по умолчанию отдаёт краям 16px, да ещё 5px своих у ion-grid внутри
     и по 5px у каждой колонки — на 375px это полстолбца, потраченных на воздух. */
  .zaiavka-row {
    --padding-start: 8px;
    --inner-padding-end: 8px;
  }

  /* width/min-width — чтобы строка жила по ширине экрана: без них длинное
     название распирает grid, и столбцы уезжают за правый край. */
  .zaiavka-row ion-grid {
    padding: 0;
    width: 100%;
    min-width: 0;
  }

  .table-header,
  .zaiavka-row ion-row {
    min-width: 0;
    flex-wrap: nowrap;
  }

  .table-header,
  .zaiavka-row ion-grid {
    --ion-grid-column-padding: 0;
  }

  /* Длинное название — одной строкой: перенос ломал высоту строк и раздвигал столбцы.
     display: block — чтобы text-overflow работал на самой колонке, без вложенных обёрток. */
  .table-header ion-col,
  .zaiavka-row ion-col {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
  }

  /* Ширины столбцов — не долями сетки, а пикселями: цифры и время занимают
     сколько занимают, а весь остаток забирает название. Одни и те же классы у
     шапки и у строк, иначе столбцы разъезжаются. */
  .table-header .col-num,
  .zaiavka-row .col-num {
    flex: 0 0 28px;
    max-width: 28px;
    text-align: start;
  }

  /* basis 0 и min-width: 0 — иначе длинное название распирает столбец, и ion-row
     переносит остальные на вторую строку вместо обрезки. */
  .table-header .col-system,
  .zaiavka-row .col-system {
    flex: 1 1 0;
    min-width: 0;
    max-width: none;
    text-align: start;
  }

  /* Отступ слева — зазор до соседа: у правых столбцов текст прижат вправо,
     и «объем» слипался с «время» в шапке. */
  /* 72px — под «9999 м²» (63px в Russo One 16px) плюс отступ: больше объём не бывает. */
  .table-header .col-volume,
  .zaiavka-row .col-volume {
    flex: 0 0 72px;
    max-width: 72px;
    padding-inline-start: 8px;
    text-align: end;
  }

  /* 54px — «время» 14px (46px) плюс отступ; значения в ion-note ещё уже (41px). */
  .table-header .col-time,
  .zaiavka-row .col-time {
    flex: 0 0 54px;
    max-width: 54px;
    padding-inline-start: 8px;
    text-align: end;
  }

  /* Заголовок времени — кеглем ion-note, как сами значения: обычным 16px он один
     держал ширину колонки. */
  .table-header .col-time {
    font-size: 14px;
    align-self: flex-end;
  }

  /* Боковые поля — свои: у этого ion-content нет ion-padding, и общая табличка
     прилегала бы к краям экрана. */
  .auth-warning {
    margin: 0 8px 8px;
  }
</style>

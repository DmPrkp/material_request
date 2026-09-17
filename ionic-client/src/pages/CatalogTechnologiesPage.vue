<template>
  <ion-page v-if="route.name === 'catalog-work-type'">
    <ion-content>
      <ion-refresher
        slot="fixed"
        @ionRefresh="handleRefresh"
      >
        <ion-refresher-content />
      </ion-refresher>

      <div class="ion-padding">
        <ion-item-divider>
          <ion-title>{{ heading }}</ion-title>
        </ion-item-divider>
      </div>

      <div
        v-if="canEdit && workType"
        class="ion-padding-horizontal"
      >
        <CutCornerBtn
          full-width
          @click="openTechnology(null)"
        >
          {{ $t("pages.catalog.structure.add_system") }}
        </CutCornerBtn>
      </div>

      <ion-item
        v-else-if="!canEdit"
        button
        lines="none"
        @click="goToAuth"
      >
        <ion-label>
          {{ $t("pages.catalog.structure.sign_in") }}
        </ion-label>
      </ion-item>

      <ion-note
        v-if="!loading && !systems.length"
        class="ion-padding empty"
      >
        {{ $t("pages.catalog.empty") }}
      </ion-note>

      <ion-list v-else>
        <ion-item
          v-for="system in systems"
          :key="system.id"
          button
          @click="openTechnology(system)"
        >
          <ion-label>
            <h3>{{ system.name }}</h3>
            <p v-if="system.description">{{ system.description }}</p>
            <p v-if="system.unit">
              {{ $t("pages.catalog.unit") }}: {{ unitLabel(system.unit) }}
            </p>
            <p>
              {{
                $t("pages.catalog.structure.stages_count", {
                  n: stagesOf(system.id).length,
                })
              }}
            </p>
          </ion-label>
          <ion-note
            v-if="isMine(system)"
            slot="end"
          >
            {{ $t("pages.catalog.structure.added_by_you") }}
          </ion-note>
          <!-- Чужую личную видит только админ: пусть знает, что это не общая. -->
          <ion-note
            v-else-if="isOthersPrivate(system)"
            slot="end"
          >
            {{ $t("pages.catalog.added_by_user") }}
          </ion-note>
        </ion-item>
      </ion-list>

      <div
        v-if="loading"
        class="ion-text-center ion-padding"
      >
        <ion-spinner />
      </div>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  /**
   * Технологии одного вида работ (/catalog/systems/:workType). В адресе code вида
   * работ, id ищем по нему в словаре.
   *
   * Названия и описания словарь отдаёт уже на языке страницы (одно name), сам
   * клиент ничего не переводит — поэтому при смене языка всё перечитывается.
   *
   * На странице только список и «Добавить»: технология вместе с этапами открывается
   * своей страницей (CatalogTechnologyPage), новая — по адресу …/new. Кнопку видит только вошедший, но это лишь
   * подсказка интерфейса: запись закрывает сам dictionary-server по токену.
   */
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { IonNote, type RefresherCustomEvent } from "@ionic/vue";
  import { useOwnership } from "@/components/pagesParts/catalog/ownership";
  import { useUnitLabel } from "@/components/pagesParts/catalog/unitLabel";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import DictionaryModel from "@/models/DictionaryModel";
  import { useAuthStore } from "@/store/auth";
  import { useWorkTypesStore } from "@/store/workTypes";
  import type {
    DictionarySystem,
    DictionaryWorkStage,
    DictionaryWorkType,
  } from "@/types/dto";

  const { locale } = useI18n({ useScope: "global" });
  const authStore = useAuthStore();
  const workTypesStore = useWorkTypesStore();
  const route = useRoute();
  const router = useRouter();

  // Не зависит от AUTH_ENABLED: флаг выключает только гвард роутов,
  // а словарь без токена запись всё равно не примет.
  const canEdit = computed(() => authStore.isAuthenticated);

  const workTypeCode = computed(() =>
    typeof route.params.workType === "string" ? route.params.workType : "",
  );
  const workType = ref<DictionaryWorkType | null>(null);
  const systems = ref<DictionarySystem[]>([]);
  const stages = ref<DictionaryWorkStage[]>([]);
  const loading = ref(false);

  const heading = computed(() => workType.value?.name ?? workTypeCode.value);

  const stagesBySystem = computed(() => {
    const grouped: Record<number, DictionaryWorkStage[]> = {};
    for (const stage of stages.value) {
      (grouped[stage.systemId] ??= []).push(stage);
    }
    for (const list of Object.values(grouped)) {
      list.sort((a, b) => a.position - b.position);
    }
    return grouped;
  });

  function stagesOf(systemId: number): DictionaryWorkStage[] {
    return stagesBySystem.value[systemId] ?? [];
  }

  // Кто вошёл — из токена, а не из профиля: профиль после перезагрузки приезжает не сразу.
  const { isMine, isOthersPrivate } = useOwnership();
  const unitLabel = useUnitLabel();

  /** force — «потянуть, чтобы обновить»: тогда и виды работ перечитываем. */
  async function load(force = false) {
    const code = workTypeCode.value;
    // Уходим обратно к плитке — параметр пропал, грузить нечего.
    if (!code) return;

    loading.value = true;
    try {
      const lang = locale.value;
      const workTypes = await workTypesStore.load(lang, force);
      // Список не пришёл (get() глотает сетевую ошибку) — оставляем, что было.
      if (workTypesStore.locale !== lang) return;

      const found = workTypes.find((item) => item.code === code);
      if (!found) {
        // Неизвестный вид работ в адресе -> обратно к плитке видов.
        router.replace({ name: "catalog-systems" });
        return;
      }
      workType.value = found;

      const [systemsPage, stagesPage] = await Promise.all([
        DictionaryModel.systems(found.id),
        DictionaryModel.workStages(),
      ]);
      if (systemsPage) systems.value = systemsPage.items;
      if (stagesPage) stages.value = stagesPage.items;
    } finally {
      loading.value = false;
    }
  }

  /** null — новая технология. */
  function openTechnology(system: DictionarySystem | null) {
    router.push({
      name: "catalog-technology",
      params: {
        locale: route.params.locale,
        workType: workTypeCode.value,
        systemId: system ? String(system.id) : "new",
      },
    });
  }

  function goToAuth() {
    router.push({
      name: "auth",
      params: { locale: route.params.locale },
      query: { redirect: route.fullPath },
    });
  }

  async function handleRefresh(event: RefresherCustomEvent) {
    await load(true);
    await event.target.complete();
  }

  // Язык — тоже повод перечитать: имена приходят с сервера уже переведёнными.
  watch([workTypeCode, locale], () => void load(), { immediate: true });

  /**
   * Вернулись со страницы технологии: страница эта всё время была смонтирована, а
   * там могли переименовать, завести копию или удалить — перечитываем список.
   */
  watch(
    () => route.name,
    (name, previous) => {
      if (name === "catalog-work-type" && previous !== name) void load();
    },
  );
</script>

<style scoped>
  .empty {
    display: block;
    text-align: center;
  }
</style>

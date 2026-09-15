<template>
  <ion-page>
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
          @click="openModal(null)"
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
          @click="openModal(system)"
        >
          <ion-label>
            <h3>{{ system.name }}</h3>
            <p v-if="system.description">{{ system.description }}</p>
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

      <TechnologyModal
        :is-open="modalOpen"
        :system="editing"
        :stages="editing ? stagesOf(editing.id) : []"
        :work-type-id="workType?.id"
        :can-edit="canEdit"
        @close="closeModal"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  /**
   * Технологии одного вида работ (/catalog/systems/:workType). В адресе code вида
   * работ, id ищем по нему в словаре.
   *
   * Названия и описания словарь отдаёт уже на языке страницы (одно name), сам
   * клиент ничего не переводит — поэтому при смене языка всё перечитывается.
   *
   * На странице только список и «Добавить»: добавление и правка технологии вместе
   * с этапами — в TechnologyModal. Кнопку видит только вошедший, но это лишь
   * подсказка интерфейса: запись закрывает сам dictionary-server по токену.
   */
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { IonNote, type RefresherCustomEvent } from "@ionic/vue";
  import TechnologyModal from "@/components/pagesParts/catalog/TechnologyModal.vue";
  import { useOwnership } from "@/components/pagesParts/catalog/ownership";
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

  const modalOpen = ref(false);
  /** null — модалка на добавление. */
  const editing = ref<DictionarySystem | null>(null);

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

  function openModal(system: DictionarySystem | null) {
    editing.value = system;
    modalOpen.value = true;
  }

  /**
   * Перечитываем на любом закрытии, а не только после успешного сохранения:
   * если упал третий этап, первые два уже в словаре, и список должен это показать.
   */
  function closeModal() {
    // didDismiss приходит и после закрытия кнопкой — второй раз не грузим.
    if (!modalOpen.value) return;
    modalOpen.value = false;
    void load();
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
</script>

<style scoped>
  .empty {
    display: block;
    text-align: center;
  }
</style>

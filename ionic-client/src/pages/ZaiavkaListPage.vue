<template>
  <ion-page v-if="route.name === 'zaiavka-list'">
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
            {{ $t("pages.zaiavka_list.title") }}
          </ion-title>
        </ion-item-divider>
      </div>
      <!-- Калькулятор — начало новой заявки: расчёт сам сохраняется и появится здесь. -->
      <ion-row class="new-zaiavka ion-justify-content-end ion-padding-horizontal">
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
            button
            :detail="false"
            @click="openItem(zaiavka.id)"
          >
            <ion-label>
              {{ $t("pages.zaiavka_list.item_title") }}
              {{ zaiavka.id }}
            </ion-label>
            <ion-note slot="end">{{ formatTime(zaiavka.createdAt) }}</ion-note>
          </ion-item>
        </ion-item-group>
      </template>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script setup lang="ts">
  import Zaiavka from "@/models/zaiavka";
  import { listKeys } from "@/models/zaiavka/anonymousKeys";
  import { claimAnonymous } from "@/models/zaiavka/claimAnonymous";
  import { useAuthStore } from "@/store/auth";
  import { MaterialRequestDTO, StoredMaterialRequestDTO } from "@/types/dto";
  import {
    IonIcon,
    IonItemGroup,
    IonNote,
    IonRow,
    RefresherCustomEvent,
  } from "@ionic/vue";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import TitledDivider from "@/components/ui/TitledDivider.vue";
  import { alertCircle } from "ionicons/icons";
  import { computed, onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();

  const pad = (n: number) => String(n).padStart(2, "0");

  function formatTime(date: string) {
    const d = new Date(date);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  type DayGroup = { key: string; label: string; items: MaterialRequestDTO[] };
  type YearGroup = { year: number; days: DayGroup[] };

  /**
   * Заявки по годам и дням, по местному времени. Порядок — как пришёл список
   * (новые сверху), группы идут в том же порядке. Месяц — «сентябрь 19»: month:
   * "long" без дня даёт именительный падеж, «сентября» было бы с днём.
   */
  const groups = computed<YearGroup[]>(() => {
    const years: YearGroup[] = [];
    for (const zaiavka of materialRequests.value) {
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
  }

  onMounted(load);

  // Страница-родитель остаётся смонтированной под открытой заявкой и в стеке Ionic —
  // перечитываем, когда на неё вернулись, и когда вошли или вышли.
  watch(
    () => route.name,
    (name) => {
      if (name === "zaiavka-list") void load();
    }
  );
  watch(() => authStore.token, () => void load());

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

  .auth-warning {
    --background: transparent;
    --color: var(--orange-01);
    margin: 0 8px 8px;
    border: 1px solid var(--orange-01);
    border-radius: 8px;
  }

  .auth-warning ion-icon {
    color: var(--orange-01);
    margin-inline-end: 12px;
  }
</style>

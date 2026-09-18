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
      <ion-list>
        <ion-item
          v-for="zaiavka in materialRequests"
          :key="zaiavka.id"
        >
          <ion-grid>
            <ion-row
              color="secondary"
              @click="openItem(zaiavka.id)"
              style="cursor: pointer"
            >
              <ion-col
                size="5"
                class="ion-align-items-start"
              >
                {{ $t("pages.zaiavka_list.item_title") }}
                {{ zaiavka.id }}
              </ion-col>
              <ion-col
                size="7"
                class="ion-align-items-start"
              >
                {{ $t("pages.zaiavka_list.from") }}
                {{ toLocaleDate(zaiavka.createdAt) }}
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-item>
      </ion-list>
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
  import { IonIcon, RefresherCustomEvent } from "@ionic/vue";
  import { alertCircle } from "ionicons/icons";
  import { onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();

  function toLocaleDate(date: string) {
    const l = new Date(Date.parse(date));
    return l.toLocaleString(route.params.locale);
  }

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

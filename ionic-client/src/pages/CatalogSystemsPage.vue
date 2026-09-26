<template>
  <ion-page v-if="route.name === 'catalog-systems'">
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>
          <h1>{{ $t("pages.catalog.tabs.systems") }}</h1>
        </ion-title>
      </ion-item-divider>

      <!--
        Смотреть виды работ можно и без входа (словарь отдаёт общее анониму), а вот
        заводить свои технологии и этапы — нет: словарь закрывает запись гвардом.
        Поэтому табличка стоит над плиткой, а не вместо неё.
      -->
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
          {{ $t("pages.catalog.structure.auth_required") }}
        </ion-label>
      </ion-item>

      <ion-note
        v-if="!loading && !items.length"
        class="ion-padding empty"
      >
        {{ $t("pages.catalog.empty") }}
      </ion-note>
      <MainMenuItems
        v-else
        :items="items"
        @item="chooseWorkType"
      />

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
   * Виды работ плиткой — как на главной, но список из словаря (work_types),
   * а не из MAIN_MENU: новый вид появится здесь без правки клиента.
   * Картинку берём из MAIN_MENU по code; у нового вида её нет — будет иконка.
   * «В разработке» тут не ставим: технологии как раз и заводятся заранее.
   *
   * Список — из стора: под /systems/:workType эта страница смонтирована вместе
   * со страницей технологий, и запрос на обе должен уходить один.
   */
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { IonIcon, IonNote } from "@ionic/vue";
  import { alertCircle, layersOutline } from "ionicons/icons";
  import MainMenuItems from "@/components/pagesParts/MainMenuItems.vue";
  import { MAIN_MENU } from "@/constants";
  import { useAuthStore } from "@/store/auth";
  import { useWorkTypesStore } from "@/store/workTypes";
  import type { MainMenuItem } from "@/types/controller/main-menu";

  const route = useRoute();
  const router = useRouter();
  const { locale } = useI18n({ useScope: "global" });
  const workTypesStore = useWorkTypesStore();
  const authStore = useAuthStore();

  const imagesByCode = Object.fromEntries(
    MAIN_MENU.map((section) => [section.title, section.img]),
  );

  const loading = ref(false);

  const items = computed<MainMenuItem[]>(() =>
    workTypesStore.items.map((workType) => ({
      title: workType.code,
      label: workType.name,
      description: workType.code,
      img: imagesByCode[workType.code],
      icon: layersOutline,
    })),
  );

  async function load() {
    loading.value = true;
    try {
      await workTypesStore.load(locale.value);
    } finally {
      loading.value = false;
    }
  }

  function chooseWorkType(item: MainMenuItem) {
    router.push({ name: "catalog-work-type", params: { workType: item.title } });
  }

  function goToAuth() {
    router.push({ name: "auth", query: { redirect: route.fullPath } });
  }

  onMounted(load);
  // Имена приходят с сервера уже на языке — сменили язык, перечитываем.
  watch(locale, () => void load());
</script>

<style scoped>
  .empty {
    display: block;
    text-align: center;
  }
</style>

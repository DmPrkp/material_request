<template>
  <ion-page v-if="route.name === 'zayavka-list'">
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
            {{ $t("pages.zayavka_list.title") }}
          </ion-title>
        </ion-item-divider>
      </div>
      <ion-list>
        <ion-item
          v-for="(zayavka, num) in materialRequests"
          :key="zayavka.id"
        >
          <ion-grid>
            <ion-row
              color="secondary"
              @click="openItem(zayavka.id)"
              style="cursor: pointer"
            >
              <ion-col
                size="1"
                class="ion-align-items-start"
              >
                {{ num + 1 }}
              </ion-col>
              <ion-col
                size="4"
                class="ion-align-items-start"
              >
                {{ $t("pages.zayavka_list.item_title") }}
                {{ zayavka.id }}
              </ion-col>
              <ion-col
                size="7"
                class="ion-align-items-start"
              >
                {{ $t("pages.zayavka_list.from") }}
                {{ toLocaleDate(zayavka.createdAt) }}
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
  import Zayavka from "@/models/zayavka";
  import { useZayavkaStore } from "@/store/zayavka";
  import { StoredMaterialRequestDTO } from "@/types/dto";
  import { RefresherCustomEvent } from "@ionic/vue";
  import { onMounted, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";
  const store = useZayavkaStore();
  const route = useRoute();
  const router = useRouter();

  function toLocaleDate(date: string) {
    const l = new Date(Date.parse(date));
    return l.toLocaleString(route.params.locale);
  }

  function openItem(id: StoredMaterialRequestDTO["id"]) {
    router.push({ name: "zayavka", params: { zayavka: id } });
  }

  const materialRequests = ref<StoredMaterialRequestDTO[]>([]);

  onMounted(async () => {
    materialRequests.value = store.getAll();

    if (materialRequests.value.length) return;

    const materialRequestsDTO = await Zayavka.findAll();
    store.define(materialRequestsDTO);
    materialRequests.value = store.getAll();
  });

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    event.target.complete();
  }
</script>

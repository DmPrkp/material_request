<template>
  <ion-page v-if="route.name === 'holdings'">
    <ion-content class="ion-padding">
      <ion-item-divider>
        <ion-title>{{ $t("pages.warehouses.title") }}</ion-title>
      </ion-item-divider>
      <WarehousesTabs />

      <!-- Выдачи живут в компании: без входа их не увидеть, как и склады. -->
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
          {{ $t("pages.warehouses.auth_required") }}
        </ion-label>
      </ion-item>

      <ion-list v-else>
        <!--
          Пока в списке один пункт — своё. Выданное другим (для own/manage компании)
          встанет сюда же строками, поэтому это список, а не сразу содержимое.
        -->
        <ion-item
          button
          :detail="true"
          @click="router.push({ name: 'on-hand' })"
        >
          <ion-label>{{ $t("pages.warehouses.on_hand.mine") }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
  <router-view v-else />
</template>

<script lang="ts" setup>
  /**
   * Таб «На руках»: что выдано людям. Своё открывается отдельной страницей
   * (OnHandPage), она же показывает содержимое.
   */
  import { IonIcon } from "@ionic/vue";
  import { alertCircle } from "ionicons/icons";
  import { useRoute, useRouter } from "vue-router";
  import WarehousesTabs from "@/components/pagesParts/warehouses/WarehousesTabs.vue";
  import { useAuthStore } from "@/store/auth";

  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();

  function goToAuth() {
    router.push({ name: "auth", query: { redirect: route.fullPath } });
  }
</script>

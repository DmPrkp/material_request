<template>
  <ion-grid>
    <ion-row>
      <ion-col
        size-xs="12"
        size-md="6"
        size-lg="4"
        v-for="(item, index) in props.items"
        :key="index"
        :item="item"
        @click="!item.img.disable && $emit('item', item)"
      >
        <ion-card>
          <div
            v-if="item.img.disable"
            class="inscription"
          >
            {{ $t("ui.labels.disable") }}
          </div>
          <img
            :src="item.img.src"
            :alt="item.img.alt"
            :class="item.img.disable ? 'grayscale-image' : ''"
          />
          <ion-card-header>
            <ion-card-title color="dark">{{
              $t(`pages.main.types.${item.title}`)
            }}</ion-card-title>
          </ion-card-header>
        </ion-card>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script setup lang="ts">
  import {
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
  } from "@ionic/vue";

  const props = defineProps(["items"]);
</script>

<style scoped>
  .inscription {
    position: absolute;
    top: 40%;
    left: 49%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    font-size: 1.25rem;
    z-index: 1;
    pointer-events: none;
  }

  .grayscale-image {
    filter: grayscale(100%);
  }
</style>

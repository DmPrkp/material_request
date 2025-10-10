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
        @click="!item.disable && $emit('item', item)"
      >
        <ion-card>
          <ImageText
            :image="item.img"
            :text="item.disable ? 'disable' : undefined"
          ></ImageText>
          <ion-card-header color="medium">
            <ion-card-title
              style="
                font-family: 'Impact';
                font-weight: 900;
                font-style: oblique 10deg;
                color: var(--ion-color-secondary);
              "
            >
              {{ $t(`pages.main.types.${item.title}`) }}
            </ion-card-title>
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

  import ImageText from "@/components/ui/ImageText.vue";
  import { MainMenuItem } from "@/types/controller/main-menu";

  const props = defineProps<{ items: MainMenuItem[] }>();
</script>

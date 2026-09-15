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
        <ion-card :class="{ icon_card: !item.img }">
          <ImageText
            v-if="item.img"
            :image="item.img"
            :text="item.disable ? 'disable' : undefined"
          ></ImageText>
          <!-- Разделы без фотографии: та же карточка, вместо снимка — иконка. -->
          <div
            v-else
            class="icon_cover"
          >
            <div
              v-if="item.disable"
              class="inscription"
            >
              {{ $t('ui.labels["disable"]') }}
            </div>
            <ion-icon
              :icon="item.icon"
              :class="item.disable ? 'grayscale-icon' : ''"
            />
          </div>
          <ion-card-header color="medium">
            <ion-card-title
              style="
                transform: skewX(-10deg);
                color: var(--ion-color-secondary);
              "
            >
              {{ item.label ?? $t(`${props.i18nPrefix}.${item.title}`) }}
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
    IonIcon,
  } from "@ionic/vue";

  import ImageText from "@/components/ui/ImageText.vue";
  import { MainMenuItem } from "@/types/controller/main-menu";

  const props = withDefaults(
    defineProps<{
      items: MainMenuItem[];
      /** Откуда брать подпись карточки: у сборников свой раздел словаря. */
      i18nPrefix?: string;
    }>(),
    { i18nPrefix: "pages.main.types" }
  );
</script>

<style scoped>
  /*
   * Карточку с фотографией по ширине задаёт сам снимок — так на главной.
   * У иконки собственной ширины нет, поэтому ion-card ужимался бы под длину
   * заголовка: «Материалы» уже, чем «Электроинструмент». Растягиваем по колонке.
   */
  .icon_card {
    width: 100%;
  }

  .icon_cover {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: var(--ion-color-light-shade, #e0e0e0);
  }

  .icon_cover ion-icon {
    font-size: 5rem;
    color: var(--ion-color-medium);
  }

  .grayscale-icon {
    filter: grayscale(100%);
    opacity: 0.5;
  }

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
</style>

<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>
        {{ $t(`pages.materials.modal.titles.${getI18Title()}`) }}
        {{ $t("pages.materials.subTitles.handTools") }}
      </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-item-divider>
      <ion-label v-if="localHandTool.ru_title">
        {{ localHandTool.ru_title }}
      </ion-label>
      <ion-input
        v-else
        label="Вид Работ"
        v-model="localHandTool.ru_title"
      ></ion-input>
    </ion-item-divider>

    <ion-item>
      <ion-row>
        <ion-col size="10">
          <ion-input
            type="number"
            :label="
              $t(`pages.materials.table.consumption`) +
              ' ' +
              $t(`pages.materials.table.totalVolume`) +
              ': '
            "
            :value="localHandTool.adjusted_consumption.toFixed(0)"
            @ionInput="calcByConsumption"
          ></ion-input>
        </ion-col>
        <ion-col
          size="2"
          class="ion-text-right"
        >
          {{ $t("measure.pcs") }}
        </ion-col>
      </ion-row>
    </ion-item>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-row>
        <ion-col size="2">
          <ion-button
            expand="block"
            @click="remove()"
            ><ion-icon
              slot="icon-only"
              :icon="trashBin"
            ></ion-icon
          ></ion-button>
        </ion-col>
        <ion-col size="5">
          <ion-button
            expand="block"
            fill="clear"
            @click="cancel()"
            >{{ $t(`ui.buttons.cancel`) }}</ion-button
          >
        </ion-col>
        <ion-col size="5">
          <ion-button
            fill="outline"
            expand="block"
            @click="confirm()"
            >{{ $t(`ui.buttons.save`) }}</ion-button
          >
        </ion-col>
      </ion-row>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts" setup>
  import { HandTool } from "@/types/dto";
  import { IonInputCustomEvent } from "@ionic/core";
  import { modalController } from "@ionic/vue";
  import { trashBin } from "ionicons/icons";
  import { ref } from "vue";

  const props = defineProps<{
    item: HandTool;
  }>();

  const localHandTool = ref<HandTool>({ ...props.item });

  function calcByConsumption(
    event: IonInputCustomEvent<{ value: string | number }>
  ) {
    const consum = Number(event.detail.value);

    if (isNaN(consum)) return;

    localHandTool.value.adjusted_consumption = Number(consum.toFixed(2));
  }

  function getI18Title() {
    return props.item ? "edit" : "add";
  }

  const cancel = () => modalController.dismiss(null, "cancel");
  const confirm = () => modalController.dismiss(localHandTool.value, "confirm");
  const remove = () => modalController.dismiss(null, "confirm");
</script>

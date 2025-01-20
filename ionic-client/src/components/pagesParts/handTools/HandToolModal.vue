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
    <ion-item-divider v-if="localHandTool.id">
      <ion-label>
        {{ localHandTool.title }}
      </ion-label>
    </ion-item-divider>
    <ion-item v-else>
      <ion-input
        :label="$t('pages.materials.table.title') + ':'"
        v-model="localHandTool.title"
      ></ion-input>
    </ion-item>

    <ion-item v-if="!isDelete()">
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
            :value="localHandTool.adjusted_consumption"
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

    <ion-item>
      <ion-row>
        <ion-col size="12">
          <span
            v-for="(desc, i) in localHandTool.descriptions"
            :key="i"
          >
            {{ desc }}
          </span>
        </ion-col>
      </ion-row>
    </ion-item>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-row>
        <ion-col size="2">
          <ion-button
            v-if="isDelete()"
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
            v-if="!isDelete()"
            fill="outline"
            expand="block"
            @click="confirm()"
            >{{ $t(`ui.buttons.save`) }}</ion-button
          >
        </ion-col>
        <ion-col size="5">
          <ion-button
            expand="block"
            fill="clear"
            @click="cancel()"
            >{{ $t(`ui.buttons.cancel`) }}</ion-button
          >
        </ion-col>
      </ion-row>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts" setup>
  import { MergedHandTool } from "@/types/dto";
  import { IonInputCustomEvent } from "@ionic/core";
  import { modalController } from "@ionic/vue";
  import { trashBin } from "ionicons/icons";
  import { ref } from "vue";

  const props = defineProps<{
    handTool: MergedHandTool;
  }>();

  const localHandTool = ref<MergedHandTool>({ ...props.handTool });

  function calcByConsumption(
    event: IonInputCustomEvent<{ value: string | number }>
  ) {
    const consum = Number(event.detail.value);

    if (isNaN(consum)) return;

    localHandTool.value.adjusted_consumption = Number(consum.toFixed(2));
  }

  const cancel = () => modalController.dismiss(null, "cancel");
  const confirm = () =>
    modalController.dismiss({ handTool: localHandTool.value }, "confirm");
  const remove = () =>
    modalController.dismiss({ handTool: localHandTool.value }, "remove");

  function getI18Title() {
    return props.handTool.id ? "delete" : "add";
  }

  function isDelete() {
    return Boolean(props.handTool.id);
  }
</script>

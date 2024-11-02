<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>
        {{ $t(`pages.materials.modal.titles.${getI18Title()}`) }}
        {{ $t("pages.materials.subTitles.powerTools") }}
      </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-item-divider v-if="localPowerTool.id">
      <ion-label>
        {{ localPowerTool.ru_title }}
      </ion-label>
    </ion-item-divider>
    <ion-item v-else>
      <ion-input
        :label="$t('pages.materials.table.title') + ':'"
        v-model="localPowerTool.ru_title"
      ></ion-input>
    </ion-item>

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
            :value="localPowerTool.adjusted_consumption"
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

    <ion-item v-if="!localPowerTool.id">
      <ion-row>
        <ion-col size="12">
          <ion-select
            :label="$t('ui.labels.corded')"
            @ionChange="handleChange($event)"
          >
            <ion-select-option :value="true">{{
              $t("current.ac")
            }}</ion-select-option>
            <ion-select-option :value="false">{{
              $t("current.dc")
            }}</ion-select-option>
          </ion-select>
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
  import { PowerTool } from "@/types/dto";
  import { IonInputCustomEvent } from "@ionic/core";
  import { modalController } from "@ionic/vue";
  import { trashBin } from "ionicons/icons";
  import { ref } from "vue";

  const props = defineProps<{
    powerTool: PowerTool;
  }>();

  const localPowerTool = ref<PowerTool>({ ...props.powerTool });

  function handleChange(ev: IonInputCustomEvent<{ value: boolean }>) {
    localPowerTool.value.corded = ev.detail.value;
  }

  function calcByConsumption(
    event: IonInputCustomEvent<{ value: string | number }>
  ) {
    const consum = Number(event.detail.value);

    if (isNaN(consum)) return;

    localPowerTool.value.adjusted_consumption = Number(consum.toFixed(2));
  }

  const cancel = () => modalController.dismiss(null, "cancel");
  const confirm = () =>
    modalController.dismiss({ powerTool: localPowerTool.value }, "confirm");
  const remove = () =>
    modalController.dismiss({ powerTool: localPowerTool.value }, "remove");

  function getI18Title() {
    return props.powerTool.id ? "edit" : "add";
  }
</script>

<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>
        {{ $t(`pages.materials.modal.titles.${getI18Title()}`) }}
        {{ $t("pages.materials.subTitles.materials") }}
      </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-item-divider v-if="localMaterial.id">
      <ion-label>
        {{ localMaterial.ru_title }}
      </ion-label>
    </ion-item-divider>
    <ion-item v-else>
      <ion-input
        label="материал"
        v-model="localMaterial.ru_title"
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
              $t(`pages.materials.table.consumptionPerSq`) +
              ': '
            "
            :value="localMaterial.consumption"
            @ionInput="calcByConsumption"
          ></ion-input>
        </ion-col>
        <ion-col
          v-if="localMaterial.measure"
          size="2"
          class="ion-text-right"
        >
          {{ $t(`measure.${localMaterial.measure}`) }}
        </ion-col>
      </ion-row>
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
            :value="
              (localMaterial.consumption * localMaterial.volume).toFixed(0)
            "
            @ionInput="calcByTotalVolume"
          ></ion-input>
        </ion-col>
        <ion-col
          v-if="localMaterial.measure"
          size="2"
          class="ion-text-right"
        >
          {{ $t(`measure.${localMaterial.measure}`) }}
        </ion-col>
      </ion-row>
    </ion-item>

    <ion-item v-if="!localMaterial.id">
      <ion-picker
        :value="localMaterial.measure"
        @ionChange="onPickerChange"
      >
        <ion-picker-column>
          <div slot="prefix">{{ $t("ui.labels.measure") }}</div>
          <ion-picker-column-option value="m²">{{
            $t("measure.m²")
          }}</ion-picker-column-option>
          <ion-picker-column-option value="l">{{
            $t("measure.l")
          }}</ion-picker-column-option>
          <ion-picker-column-option value="kg">{{
            $t("measure.kg")
          }}</ion-picker-column-option>
          <ion-picker-column-option value="m">{{
            $t("measure.m")
          }}</ion-picker-column-option>
          <ion-picker-column-option value="pcs">{{
            $t("measure.pcs")
          }}</ion-picker-column-option>
        </ion-picker-column>
      </ion-picker>
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
  import { Material } from "@/types/dto";
  import { IonInputCustomEvent, IonPickerCustomEvent } from "@ionic/core";
  import { modalController } from "@ionic/vue";
  import { trashBin } from "ionicons/icons";
  import { ref } from "vue";

  const props = defineProps<{
    id: number;
    material: Material;
  }>();

  const localMaterial = ref<Material>({ ...props.material });
  const componentId = ref<number>(props.id);

  function calcByConsumption(
    event: IonInputCustomEvent<{ value: string | number }>
  ) {
    const consum = Number(event.detail.value);

    if (isNaN(consum)) return;

    localMaterial.value.consumption = Number(consum.toFixed(2));
  }

  function calcByTotalVolume(
    event: IonInputCustomEvent<{ value: string | number }>
  ) {
    const totVol = Number(event.detail.value);
    const consum = totVol / localMaterial.value.volume;
    calcByConsumption({ detail: { value: consum } } as IonInputCustomEvent<{
      value: string | number;
    }>);
  }

  function getI18Title() {
    return props.id ? "edit" : "add";
  }

  const onPickerChange = (event: IonPickerCustomEvent<{ value: string }>) => {
    localMaterial.value.measure = event.detail.value;
  };

  const cancel = () => modalController.dismiss(null, "cancel");
  const confirm = () =>
    modalController.dismiss(
      {
        id: componentId.value,
        material: localMaterial.value,
      },
      "confirm"
    );
  const remove = () =>
    modalController.dismiss(
      {
        id: componentId.value,
        material: localMaterial.value,
      },
      "remove"
    );
</script>

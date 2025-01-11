<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>
        {{ $t(`pages.materials.modal.titles.${getModalType()}`) }}
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
      <ion-input v-model="localMaterial.ru_title">
        <div slot="label">Материал <ion-text color="danger">* </ion-text></div>
      </ion-input>
    </ion-item>

    <ion-item>
      <ion-row>
        <ion-col size="10">
          <ion-input
            type="number"
            :value="localMaterial.consumption"
            @ionInput="calcByConsumption"
          >
            <div slot="label">
              {{
                $t(`pages.materials.table.consumption`) +
                " " +
                $t(`pages.materials.table.consumptionPerSq`) +
                ": "
              }}
              <ion-text color="danger">* </ion-text>
            </div>
          </ion-input>
        </ion-col>
        <ion-col
          v-if="localMaterial.measure"
          size="2"
          class="ion-text-right"
        >
          {{ localMaterial.measure }}
        </ion-col>
      </ion-row>
    </ion-item>

    <ion-item>
      <ion-row>
        <ion-col size="10">
          <ion-input
            type="number"
            :value="
              (localMaterial.consumption * localMaterial.volume).toFixed(0)
            "
            @ionInput="calcByTotalVolume"
          >
            <div slot="label">
              {{
                $t(`pages.materials.table.consumption`) +
                " " +
                $t(`pages.materials.table.totalVolume`) +
                ": "
              }}
              <ion-text color="danger">* </ion-text>
            </div>
          </ion-input>
        </ion-col>
        <ion-col
          v-if="localMaterial.measure"
          size="2"
          class="ion-text-right"
        >
          {{ localMaterial.measure }}
        </ion-col>
      </ion-row>
    </ion-item>

    <ion-item v-if="!localMaterial.id">
      <ion-row>
        <ion-col size="12">
          <ion-select
            :value="localMaterial.measure"
            @ionChange="onPickerChange"
          >
            <div slot="label">
              {{ $t("ui.labels.measure") }}
              <ion-text color="danger">* </ion-text>
            </div>
            <ion-select-option :value="$t('measure.m²')">{{
              $t("measure.m²")
            }}</ion-select-option>
            <ion-select-option :value="$t('measure.l')">{{
              $t("measure.l")
            }}</ion-select-option>
            <ion-select-option :value="$t('measure.kg')">{{
              $t("measure.kg")
            }}</ion-select-option>
            <ion-select-option :value="$t('measure.m')">{{
              $t("measure.m")
            }}</ion-select-option>
            <ion-select-option :value="$t('measure.pcs')">{{
              $t("measure.pcs")
            }}</ion-select-option>
          </ion-select>
        </ion-col>
      </ion-row>
    </ion-item>
    <ion-row>
      <ion-col>
        <ion-text color="danger">* - все поля обязательные</ion-text>
      </ion-col>
    </ion-row>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-row>
        <ion-col size="2">
          <ion-button
            v-if="getModalType() === 'edit'"
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
            @click="confirm(getModalType() === 'edit' ? 'edit' : 'add')"
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

  const onPickerChange = (event: IonPickerCustomEvent<{ value: string }>) => {
    localMaterial.value.measure = event.detail.value;
  };

  const cancel = () => modalController.dismiss(null, "cancel");
  const confirm = (role: string) => {
    modalController.dismiss(
      {
        id: props.id,
        material: {
          ...localMaterial.value,
          id: localMaterial.value.id || Date.now(),
        },
      },
      role
    );
  };

  const remove = () => {
    modalController.dismiss(
      {
        id: props.id,
        material: localMaterial.value,
      },
      "remove"
    );
  };

  function getModalType() {
    return props.material.id ? "edit" : "add";
  }
</script>

<style scoped>
  .label-text-wrapper.sc-ion-input-md {
    max-width: 400px;
  }
</style>

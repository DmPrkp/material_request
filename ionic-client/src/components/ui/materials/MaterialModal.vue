<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>
        {{ $t(`pages.materials.modal.titles.${getI18Title()}`) }}
      </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <div v-if="localMaterial">
      <ion-item-divider>
        <ion-label>
          {{ localMaterial.ru_title }}
        </ion-label>
      </ion-item-divider>

      <ion-item>
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
      </ion-item>

      <ion-item>
        <ion-input
          type="number"
          :label="
            $t(`pages.materials.table.consumption`) +
            ' ' +
            $t(`pages.materials.table.totalVolume`) +
            ': '
          "
          :value="(localMaterial.consumption * localMaterial.volume).toFixed(0)"
          @ionInput="calcByTotalVolume"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="floating">Measure</ion-label>
        <ion-input
          v-model="localMaterial.measure"
          placeholder="Enter measure"
        ></ion-input>
      </ion-item>
    </div>
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
  import { IonInputCustomEvent } from "@ionic/core";
  import { modalController } from "@ionic/vue";
  import { trashBin } from "ionicons/icons";
  import { ref } from "vue";

  const props = defineProps<{
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

  function getI18Title() {
    return "add"; // Replace this with your logic if needed
  }

  const cancel = () => modalController.dismiss(null, "cancel");
  const confirm = () => modalController.dismiss(localMaterial.value, "confirm");
  const remove = () => modalController.dismiss(null, "confirm");
</script>

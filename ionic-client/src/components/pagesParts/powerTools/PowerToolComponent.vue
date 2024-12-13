<template>
  <ion-item-divider color="secondary">
    <ion-title>
      {{ $t("pages.materials.subTitles.powerTools") }}
    </ion-title>
  </ion-item-divider>

  <ion-row>
    <ion-col size="1"> № </ion-col>

    <ion-col size="7">
      <div>{{ $t(`pages.materials.table.title`) }}</div>
    </ion-col>

    <ion-col size="4">
      {{ $t(`pages.materials.table.consumption`) }}
    </ion-col>
  </ion-row>

  <PowerToolListItems
    v-model="mergedPowerTools"
    @delete="setOpen"
  />
  <ion-grid>
    <ion-row class="ion-justify-content-end">
      <ion-col size="auto">
        <ion-button
          size="small"
          @click="setOpen"
        >
          {{ $t("ui.buttons.add") }}
        </ion-button>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts" setup>
  import { CalcResponseDTO, PowerTool, MergedPowerTools } from "@/types/dto";
  import PowerToolListItems from "./PowerToolListItems.vue";
  import { ref, watch } from "vue";
  import { modalController } from "@ionic/vue";
  import PowerToolModal from "./PowerToolModal.vue";

  const props = defineProps<{
    components: CalcResponseDTO[];
  }>();

  const emit = defineEmits(["update"]);
  const mergedPowerToolsMap = ref<MergedPowerTools>({});
  const mergedPowerTools = ref<PowerTool[]>([]);

  watch(
    () => mergedPowerTools.value,
    (newVal) => {
      emit("update", newVal);
    },
    { deep: true }
  );

  watch(
    () => props.components,
    (components) => {
      mergedPowerToolsMap.value = components.reduce((acc, m) => {
        m.power_tools.forEach((p) => {
          const uniqKey = `${p.id}:${p.params.map((p) => p.id).join()}`;

          if (!acc[uniqKey]) {
            acc[uniqKey] = { ...p, uniqKey };
            return acc;
          }

          if (acc[uniqKey].adjusted_consumption < p.adjusted_consumption) {
            acc[uniqKey] = { ...p, uniqKey };
          }
        });
        return acc;
      }, {} as MergedPowerTools);
      mergedPowerTools.value = Object.values(mergedPowerToolsMap.value);
    },
    { immediate: true }
  );

  const setOpen = async (powerToolKey: PowerTool["uniqKey"]) => {
    const powerTool = mergedPowerToolsMap.value[powerToolKey] || {};
    const modal = await modalController.create({
      component: PowerToolModal,
      componentProps: { powerTool },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss<{
      powerTool: PowerTool;
    }>();

    if (!data?.powerTool || !role) return;

    handleMaterialUpdate(data.powerTool, role);
    mergedPowerTools.value = Object.values(mergedPowerToolsMap.value);
  };

  function handleMaterialUpdate(powerTool: PowerTool, role: string) {
    const isNewTool = !powerTool.uniqKey;

    if (isNewTool && role === "confirm") {
      const id = Date.now();
      powerTool.uniqKey = String(id);
      powerTool.id = id;
    }

    if (role === "confirm") {
      mergedPowerToolsMap.value[powerTool.uniqKey] = { ...powerTool };
    } else if (role === "remove") {
      delete mergedPowerToolsMap.value[powerTool.uniqKey];
    }
  }
</script>

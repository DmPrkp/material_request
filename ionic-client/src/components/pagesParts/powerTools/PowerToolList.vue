<template>
  <PowerToolListHeader />

  <PowerToolListItems
    v-model="mergedPowerTools"
    @delete="setOpen"
  />
  <ion-grid v-if="status !== MATERIAL_LIST_STATUS.DISABLED">
    <ion-row class="ion-justify-content-end">
      <ion-col size="auto">
        <!-- <ion-button
          size="small"
          @click="setOpen"
        >
          {{ $t("ui.buttons.add") }}
        </ion-button> -->
        <CutCornerBtn @click="setOpen">{{ $t("ui.buttons.add") }}</CutCornerBtn>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts" setup>
  import { modalController } from "@ionic/vue";
  import { ref, watch } from "vue";
  import { CalcResponseDTO, PowerTool, MergedPowerTools } from "@/types/dto";
  import { MaterialListStatus } from "@/types/ui";
  import { MATERIAL_LIST_STATUS } from "@/constants";
  import PowerToolListItems from "./PowerToolListItems.vue";
  import PowerToolModal from "./PowerToolModal.vue";
  import PowerToolListHeader from "./PowerToolListHeader.vue";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";

  const props = defineProps<{
    components: CalcResponseDTO[];
    status: MaterialListStatus;
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

  const setOpen = async (powerToolKey: PowerTool["uniqKey"] | MouseEvent) => {
    const powerTool =
      typeof powerToolKey === "string"
        ? mergedPowerToolsMap.value[powerToolKey]
        : {};
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

<template>
  <HandToolListHeader />

  <HandToolListItems
    v-model="mergedHandTools"
    @delete="setOpen"
  />
  <ion-grid
    class="ion-justify-content-end"
    v-if="status !== MATERIAL_LIST_STATUS.DISABLED"
  >
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
  import { ref, watch } from "vue";
  import { modalController } from "@ionic/vue";
  import {
    CalcResponseDTO,
    MergedHandTool,
    MergedHandTools,
  } from "@/types/dto";
  import { MaterialListStatus } from "@/types/ui";
  import { MATERIAL_LIST_STATUS } from "@/constants";
  import HandToolListItems from "./HandToolListItems.vue";
  import HandToolModal from "./HandToolModal.vue";
  import HandToolListHeader from "./HandToolListHeader.vue";

  const props = defineProps<{
    components: CalcResponseDTO[];
    status: MaterialListStatus;
  }>();

  const emit = defineEmits(["update"]);
  const mergedHandToolsMap = ref<MergedHandTools>({});
  const mergedHandTools = ref<MergedHandTool[]>([]);

  watch(
    () => mergedHandTools.value,
    (newVal) => {
      emit("update", newVal);
    },
    { deep: true }
  );

  watch(
    () => props.components,
    (components) => {
      mergedHandToolsMap.value = components.reduce((acc, m) => {
        m.hand_tools.forEach((h) => {
          const uniqKey = `${h.id}:${h.params.map((p) => p.id).join()}`;

          if (!acc[uniqKey]) {
            acc[uniqKey] = {
              id: h.id,
              uniqKey,
              params: h.params,
              adjusted_consumption: h.adjusted_consumption,
              title: h.title,
            };
          }

          if (acc[uniqKey].adjusted_consumption < h.adjusted_consumption) {
            acc[uniqKey] = {
              ...acc[uniqKey],
              adjusted_consumption: h.adjusted_consumption,
            };
          }

          if (h.description) {
            const oldDescriptions = acc[uniqKey].descriptions || [];
            const descriptions = [...oldDescriptions, h.description];
            acc[uniqKey] = { ...acc[uniqKey], descriptions };
          }
        });
        return acc;
      }, {} as MergedHandTools);
      mergedHandTools.value = Object.values(mergedHandToolsMap.value);
    },
    { immediate: true }
  );

  const setOpen = async (handToolKey: MergedHandTool["uniqKey"]) => {
    const handTool = mergedHandToolsMap.value[handToolKey] || {};
    const modal = await modalController.create({
      component: HandToolModal,
      componentProps: { handTool },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss<{
      handTool: MergedHandTool;
    }>();

    if (!data?.handTool || !role) return;

    handleMaterialUpdate(data.handTool, role);
    mergedHandTools.value = Object.values(mergedHandToolsMap.value);
  };

  function handleMaterialUpdate(handTool: MergedHandTool, role: string) {
    const isNewTool = !handTool.uniqKey;

    if (isNewTool && role === "confirm") {
      const id = Date.now();
      handTool.uniqKey = String(id);
      handTool.id = id;
    }

    if (role === "confirm") {
      mergedHandToolsMap.value[handTool.uniqKey] = { ...handTool };
    } else if (role === "remove") {
      delete mergedHandToolsMap.value[handTool.uniqKey];
    }
  }
</script>

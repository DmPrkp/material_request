<template>
  <ion-item-divider color="secondary">
    <ion-title>
      {{ $t("pages.materials.subTitles.handTools") }}
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

  <HandToolListItems v-model="mergedHandTools" />
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
  import { CalcResponseDTO, HandTool, MergedHandTools } from "@/types/dto";
  import HandToolListItems from "./HandToolListItems.vue";
  import { ref, watch } from "vue";
  import { modalController } from "@ionic/vue";
  import HandToolModal from "./HandToolModal.vue";

  const props = defineProps<{
    components: CalcResponseDTO[];
  }>();

  const emit = defineEmits(["update"]);
  const mergedHandToolsMap = ref<MergedHandTools>({});
  const mergedHandTools = ref<HandTool[]>([]);

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
            acc[uniqKey] = { ...h, uniqKey };
            return acc;
          }

          if (acc[uniqKey].adjusted_consumption < h.adjusted_consumption) {
            acc[uniqKey] = { ...h, uniqKey };
          }
        });
        return acc;
      }, {} as MergedHandTools);
      mergedHandTools.value = Object.values(mergedHandToolsMap.value);
      emit("update", mergedHandTools.value);
    },
    { immediate: true }
  );

  const setOpen = async (handTool: Partial<HandTool>) => {
    const modal = await modalController.create({
      component: HandToolModal,
      componentProps: { handTool },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss<{
      handTool: HandTool;
    }>();

    if (!data?.handTool || !role) return;

    handleMaterialUpdate(data.handTool, role);
    emit("update", mergedHandTools.value);
  };

  function handleMaterialUpdate(handTool: HandTool, role: string) {
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

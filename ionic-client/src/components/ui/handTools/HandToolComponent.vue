<template>
  <ion-item-divider color="secondary">
    <ion-title>
      {{ $t("pages.materials.subTitles.handTools") }}
    </ion-title>
  </ion-item-divider>

  <ion-row class="custom-margin">
    <ion-col size="1"> № </ion-col>

    <ion-col size="7">
      <div>{{ $t(`pages.materials.table.title`) }}</div>
    </ion-col>

    <ion-col size="4">
      {{ $t(`pages.materials.table.consumption`) }}
    </ion-col>
  </ion-row>
  <ion-item-group>
    <HandToolListItems
      @modal="setOpen"
      :hand_tools="Object.values(mergedHandTools)"
    />
  </ion-item-group>
</template>

<script lang="ts" setup>
  import { CalcResponseDTO, HandTool } from "@/types/dto";
  import HandToolListItems from "./HandToolListItems.vue";
  import { ref, watch } from "vue";

  const props = defineProps<{
    materials: CalcResponseDTO[];
  }>();

  const mergedHandTools = ref<Record<string, HandTool>>({});

  const emit = defineEmits(["modal"]);
  const setOpen = (tool: HandTool) => {
    emit("modal", tool);
  };

  watch(
    () => props.materials,
    (materials) => {
      mergedHandTools.value = materials.reduce((acc, m) => {
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
      }, {} as Record<string, HandTool>);
    },
    { immediate: true }
  );
</script>

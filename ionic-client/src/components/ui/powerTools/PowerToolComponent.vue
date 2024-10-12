<template>
  <ion-item-divider color="secondary">
    <ion-title>
      {{ $t("pages.materials.subTitles.powerTools") }}
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
    <PowerToolListItems
      @modal="setOpen"
      :power_tools="Object.values(mergedPowerTools)"
    />
  </ion-item-group>
</template>

<script lang="ts" setup>
  import { CalcResponseDTO, PowerTool } from "@/types/dto";
  import PowerToolListItems from "./PowerToolListItems.vue";
  import { ref, watch } from "vue";

  const props = defineProps<{
    materials: CalcResponseDTO[];
  }>();

  const emit = defineEmits(["modal"]);
  const setOpen = (tool: PowerTool) => {
    emit("modal", tool);
  };

  const mergedPowerTools = ref<Record<string, PowerTool>>({});

  watch(
    () => props.materials,
    (materials) => {
      mergedPowerTools.value = materials.reduce((acc, m) => {
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
      }, {} as Record<string, PowerTool>);
    },
    { immediate: true }
  );
</script>

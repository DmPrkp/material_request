<template>
  <MaterialComponentHeader />
  <ion-item-group
    v-for="component in components"
    :key="component.id"
  >
    <ion-item-divider v-if="component.materials.length">
      <ion-label>
        {{ $t(`pages.components.items.${component.title}`) }}
      </ion-label>
    </ion-item-divider>
    <MaterialListItems
      @modal="setOpen"
      :materials="component.materials"
    />
  </ion-item-group>
</template>

<script lang="ts" setup>
  import MaterialComponentHeader from "./MaterialComponentHeader.vue";
  import MaterialListItems from "./MateriaListItems.vue";
  import { CalcResponseDTO, Material } from "@/types/dto";

  defineProps<{
    components: CalcResponseDTO[];
  }>();

  const emit = defineEmits(["modal"]);
  const setOpen = (material: Material) => {
    emit("modal", material);
  };
</script>

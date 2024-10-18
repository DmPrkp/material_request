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
      @modal="(e) => setOpen(component.id, e)"
      :materials="component.materials"
    />
    <ion-grid v-if="component.materials.length">
      <ion-row class="ion-justify-content-end">
        <ion-col size="auto">
          <ion-button
            size="small"
            @click="$emit('modal', { volume: component.materials[0].volume })"
          >
            {{ $t("ui.buttons.add") }}
          </ion-button>
        </ion-col>
      </ion-row>
    </ion-grid>
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
  const setOpen = (componentId: number, material: Material) => {
    emit("modal", { id: componentId, material });
  };
</script>

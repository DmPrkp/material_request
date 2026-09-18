<template>
  <ion-item
    v-for="(material, num) in materials"
    :key="materialKey(material)"
    :class="{ unfilled: unfilled?.has(materialKey(material)) }"
    @click="setOpen(material)"
    style="cursor: pointer"
  >
    <ion-grid>
      <ion-row>
        <ion-col size="1">
          <UnfilledMark v-if="unfilled?.has(materialKey(material))" />
          <template v-else>{{ num + 1 }}</template>
        </ion-col>
        <ion-col
          size="6"
          class="ion-align-items-start ion-text-start"
        >
          {{ material.title }}
          <span
            v-for="param in material.params"
            :key="param.id"
          >
            {{ calcParamLabel(param) }} {{ " " }}
          </span>
        </ion-col>
        <ion-col size="2">
          {{ material.consumption }}
        </ion-col>
        <ion-col
          size="2"
          class="ion-text-right"
        >
          {{ (material.consumption * material.volume).toFixed(0) }}
        </ion-col>
        <ion-col
          size="1"
          class="ion-text-right"
        >
          {{ material.measure }}
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
</template>

<script setup lang="ts">
  import { Material } from "@/types/dto";
  import UnfilledMark from "@/components/ui/UnfilledMark.vue";
  import { useParamLabel } from "@/components/pagesParts/catalog/paramLabel";
  import { materialKey } from "./materialKey";

  defineProps<{
    materials: Material[];
    /** materialKey строк с нулём из расчёта, которые пользователь ещё не трогал */
    unfilled?: Set<string>;
  }>();

  const { calcParamLabel } = useParamLabel();

  const emit = defineEmits(["modal"]);

  const setOpen = (material: Material) => {
    emit("modal", material);
  };
</script>

<style scoped>
  ion-item.unfilled {
    --color: var(--orange-01);
  }
</style>

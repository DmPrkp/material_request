<template>
  <ion-item
    v-for="(material, num) in materials"
    :key="materialKey(material)"
    :class="{ unfilled: unfilled?.has(materialKey(material)) }"
    :button="!readonly"
    :detail="false"
    @click="setOpen(material)"
  >
    <ion-grid>
      <!-- Числа — по центру высоты строки: название бывает в две-три строки. -->
      <ion-row class="ion-align-items-center">
        <ion-col
          size="1"
          class="cell-center"
        >
          <UnfilledMark v-if="unfilled?.has(materialKey(material))" />
          <template v-else>{{ num + 1 }}</template>
        </ion-col>
        <ion-col
          :size="readonly ? 7 : 6"
          class="ion-text-start cell-name"
        >
          {{ material.title }}
          <span
            v-for="param in material.params"
            :key="param.id"
            class="param"
          >
            {{ calcParamLabel(param) }} {{ " " }}
          </span>
        </ion-col>
        <!-- В сохранённой заявке расход на м² не нужен: её читают, чтобы закупить. -->
        <ion-col
          v-if="!readonly"
          size="2"
          class="cell-center"
        >
          {{ material.consumption }}
        </ion-col>
        <ion-col
          size="2"
          class="cell-center"
        >
          {{ materialTotal(material) }}
        </ion-col>
        <ion-col
          :size="readonly ? 2 : 1"
          class="cell-center"
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
  import { materialTotal } from "./materialTotal";

  const props = defineProps<{
    materials: Material[];
    /** materialKey строк с нулём из расчёта, которые пользователь ещё не трогал */
    unfilled?: Set<string>;
    /** Сохранённая заявка: строка не открывает правку, и расхода на м² нет. */
    readonly?: boolean;
  }>();

  const { calcParamLabel } = useParamLabel();

  const emit = defineEmits(["modal"]);

  const setOpen = (material: Material) => {
    if (props.readonly) return;
    emit("modal", material);
  };
</script>

<style scoped>
  /* Параметр сборки — своей строкой под названием: «Бур по бетону SDS+ / Ø 6 мм /
     дл. 150 мм» читается быстрее, чем одной строкой. */
  .param {
    display: block;
  }

  ion-item.unfilled {
    --color: var(--orange-01);
  }
</style>

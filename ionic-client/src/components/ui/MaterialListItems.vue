<template>
  <!-- <ion-list> -->
  <ion-item
    v-for="(material, num) in localMaterials"
    :key="material.id"
  >
    <ion-grid>
      <ion-row>
        <ion-col size="1">
          {{ num + 1 }}
        </ion-col>
        <ion-col
          size="7"
          class="ion-align-items-start"
        >
          <div>
            {{ material.ru_title }}
            <span
              v-for="param in material.params"
              :key="param.param"
            >
              {{ param.param }} {{ $t(`measure.${param.measure}`) }} {{ " " }}
            </span>
          </div>
        </ion-col>

        <!-- Right side: adjusted consumption -->
        <ion-col
          size="2"
          @click="openPopover(material.id)"
        >
          {{ material.consumption }}
          {{ $t(`measure.${material.measure}`) }}

          <ion-popover
            :is-open="popoverOpen[material.id]"
            @didDismiss="popoverOpen[material.id] = false"
          >
            <ion-content>
              <ion-input
                label=""
                type="number"
                :value="material.consumption"
                @ionBlur="(e: Event) => setConsumption(e, material)"
              />
            </ion-content>
          </ion-popover>
        </ion-col>
        <ion-col
          size="2"
          class="ion-text-right"
        >
          {{ material.consumption * material.volume }}
          {{ $t(`measure.${material.measure}`) }}
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
  <!-- </ion-list> -->
</template>

<script setup lang="ts">
  import { Material } from "@/types/dto";
  import { ref } from "vue";

  const props = defineProps<{
    materials: Material[];
  }>();

  // const defaultMaterials = props.materials;
  const localMaterials = ref(props.materials);
  const popoverOpen = ref(
    props.materials.reduce((a, m) => {
      a[m.id] = false;
      return a;
    }, {} as Record<number, boolean>)
  );

  function openPopover(event: Material["id"]) {
    popoverOpen.value = { ...popoverOpen.value, [event]: true };
  }

  function setConsumption(value: any, m: any) {
    console.log("value", value.detail);
    console.log("value", m);
  }
</script>

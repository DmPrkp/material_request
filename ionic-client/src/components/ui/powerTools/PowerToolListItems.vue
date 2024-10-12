<template>
  <ion-list>
    <ion-item
      v-for="(tool, num) in power_tools"
      :key="tool.uniqKey"
    >
      <ion-grid>
        <ion-row
          @click="setOpen(tool)"
          color="secondary"
        >
          <ion-col size="1">
            {{ num + 1 }}
          </ion-col>
          <ion-col
            size="7"
            class="ion-align-items-start"
          >
            <div>
              {{ tool.ru_title }}
              {{ $t(`current.${tool.corded ? "ac" : "dc"}`) }}
              <span
                v-for="param in tool.params"
                :key="param.param"
              >
                {{ param.param }} {{ $t(`measure.${param.measure}`) }}
              </span>
            </div>
          </ion-col>

          <!-- Right side: adjusted consumption -->
          <ion-col
            size="4"
            class="ion-text-right"
          >
            {{ tool.adjusted_consumption }} {{ "шт" }}
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
  import { PowerTool } from "@/types/dto";

  defineProps<{
    power_tools: PowerTool[];
  }>();

  const emit = defineEmits(["modal"]);
  const setOpen = (tool: PowerTool) => {
    emit("modal", tool);
  };
</script>

<template>
  <ion-list>
    <ion-item
      v-for="(tool, num) in hand_tools"
      :key="tool.id"
    >
      <ion-grid>
        <ion-row color="secondary">
          <ion-col size="1">
            {{ num + 1 }}
          </ion-col>
          <ion-col
            size="7"
            class="ion-align-items-start"
          >
            <div>
              {{ tool.ru_title }}
              <span
                v-for="param in tool.params"
                :key="param.param"
              >
                {{ param.param }} {{ $t(`measure.${param.measure}`) }} {{ " " }}
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
  import { HandTool } from "@/types/dto";

  defineProps<{
    hand_tools: HandTool[];
  }>();
</script>

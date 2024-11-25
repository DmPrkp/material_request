<template>
  <ion-list>
    <ion-item
      v-for="(tool, num) in power_tools"
      :key="tool.uniqKey"
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
            size="1"
            class="ion-text-right"
          >
            <ion-button
              shape="round"
              fill="outline"
              color="medium"
              @click="tool.adjusted_consumption = --tool.adjusted_consumption"
            >
              <ion-icon
                slot="icon-only"
                :icon="remove"
              ></ion-icon>
            </ion-button>
          </ion-col>

          <ion-col
            size="1"
            class="ion-text-right"
          >
            {{ tool.adjusted_consumption }}
          </ion-col>

          <ion-col
            size="1"
            class="ion-text-right"
          >
            <ion-button
              shape="round"
              fill="outline"
              color="medium"
              @click="tool.adjusted_consumption = ++tool.adjusted_consumption"
            >
              <ion-icon
                slot="icon-only"
                :icon="add"
              ></ion-icon>
            </ion-button>
          </ion-col>
          <ion-col
            size="1"
            class="ion-text-right"
          >
            {{ $t("measure.pcs") }}
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
  import { PowerTool } from "@/types/dto";
  import { add, remove } from "ionicons/icons";

  defineProps<{
    power_tools: PowerTool[];
  }>();
</script>

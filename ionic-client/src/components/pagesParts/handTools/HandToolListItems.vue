<template>
  <ion-list>
    <ion-item
      v-for="(tool, num) in modelValue"
      :key="tool.uniqKey"
      :class="{ unfilled: isUnfilled(tool) }"
    >
      <ion-grid>
        <!-- Числа и кнопки — по центру высоты строки: название бывает в две строки. -->
        <ion-row
          color="secondary"
          class="ion-align-items-center"
        >
          <ion-col
            size="1"
            class="cell-center"
          >
            <UnfilledMark v-if="isUnfilled(tool)" />
            <template v-else>{{ num + 1 }}</template>
          </ion-col>
          <ion-col
            size="7"
            class="ion-text-start cell-name"
          >
            <div>
              {{ tool.title }}
              <span
                v-for="param in tool.params"
                :key="param.id"
              >
                {{ calcParamLabel(param) }} {{ " " }}
              </span>
            </div>
          </ion-col>

          <!-- Right side: adjusted consumption -->
          <ion-col
            v-if="checkIsDisableToChange()"
            size="1"
            class="cell-center"
          >
            <ion-button
              shape="round"
              fill="outline"
              color="medium"
              @click="action(--tool.adjusted_consumption, tool)"
            >
              <ion-icon
                slot="icon-only"
                :icon="remove"
              ></ion-icon>
            </ion-button>
          </ion-col>

          <ion-col
            :size="checkIsDisableToChange() ? 1 : 2"
            class="cell-center"
          >
            {{ tool.adjusted_consumption }}
          </ion-col>

          <ion-col
            v-if="checkIsDisableToChange()"
            size="1"
            class="cell-center"
          >
            <ion-button
              shape="round"
              fill="outline"
              color="medium"
              @click="action(++tool.adjusted_consumption, tool)"
            >
              <ion-icon
                slot="icon-only"
                :icon="add"
              ></ion-icon>
            </ion-button>
          </ion-col>
          <ion-col
            :size="checkIsDisableToChange() ? 1 : 2"
            class="cell-center"
          >
            {{ $t("measure.pcs") }}
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
  import { ref } from "vue";
  import UnfilledMark from "@/components/ui/UnfilledMark.vue";
  import { useParamLabel } from "@/components/pagesParts/catalog/paramLabel";
  import { MATERIAL_LIST_STATUS } from "@/constants";
  import { MergedHandTool } from "@/types/dto";
  import { MaterialListStatus } from "@/types/ui";
  import { add, remove } from "ionicons/icons";

  const props = defineProps<{
    modelValue: MergedHandTool[];
    status?: MaterialListStatus;
  }>();

  const emit = defineEmits(["update:modelValue", "delete"]);

  const { calcParamLabel } = useParamLabel();

  /**
   * Ноль из расчёта подсвечиваем, пока пользователь не нажал +/−: после этого
   * количество — его решение, даже если он вернул его к нулю и отменил удаление.
   */
  const touched = ref(new Set<string>());

  function isUnfilled(tool: MergedHandTool) {
    return (
      checkIsDisableToChange() &&
      !tool.adjusted_consumption &&
      !touched.value.has(tool.uniqKey)
    );
  }

  function action(val: number, tool: MergedHandTool) {
    touched.value.add(tool.uniqKey);
    if (val < 1) {
      emit("delete", tool.uniqKey);
      val = 0;
    }

    tool.adjusted_consumption = val;
    emit("update:modelValue", props.modelValue);
  }

  function checkIsDisableToChange() {
    return props.status !== MATERIAL_LIST_STATUS.DISABLED;
  }
</script>

<style scoped>
  ion-item.unfilled {
    --color: var(--orange-01);
  }
</style>

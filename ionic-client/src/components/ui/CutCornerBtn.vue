<template>
  <!--
    С to — ссылка: переход, который должен видеть поисковик (главная → калькулятор),
    обработчиком клика он не найдёт. Кнопку в <a> не завернуть — вложенные
    интерактивные элементы, поэтому ссылкой становится сама кнопка.
  -->
  <router-link
    v-if="to"
    :to="to"
    class="cut-corner"
    :class="{ 'full-width': fullWidth }"
  >
    <span class="label"><slot></slot></span>
  </router-link>
  <button
    v-else
    class="cut-corner"
    @click="$emit('click', $event)"
    :class="{ 'full-width': fullWidth }"
    :disabled="disabled"
  >
    <span class="label"><slot></slot></span>
  </button>
</template>

<script lang="ts" setup>
  import type { RouteLocationRaw } from "vue-router";

  interface Props {
    fullWidth?: boolean;
    disabled?: boolean;
    to?: RouteLocationRaw;
  }

  withDefaults(defineProps<Props>(), {
    fullWidth: false,
    disabled: false,
    to: undefined,
  });

  defineEmits<{
    click: [event: MouseEvent];
  }>();
</script>

<style scoped>
  .cut-corner {
    --border: 2px;
    --slant: 0.5em;
    --color: var(--ion-color-primary);

    font-size: 1rem;
    padding: 0.4em 1.2em !important;
    /* У Russo One одно начертание — 400. С 900 браузер дорисовал бы синтетический жирный. */
    font-weight: 400;
    border: none;
    color: var(--color);
    background: linear-gradient(to bottom left, var(--color) 50%, #0000 50.1%)
        top right,
      linear-gradient(to top right, var(--color) 50%, #0000 50.1%) bottom left;
    background-size: calc(var(--slant) + 1.3 * var(--border))
      calc(var(--slant) + 1.3 * var(--border));
    background-repeat: no-repeat;
    box-shadow: 0 0 0 200px inset var(--s, #0000),
      0 0 0 var(--border) inset var(--color);
    /* background-color: var(--ion-color-medium); */
    clip-path: polygon(
      0 0,
      calc(100% - var(--slant)) 0,
      100% var(--slant),
      100% 100%,
      var(--slant) 100%,
      0 calc(100% - var(--slant))
    );
  }

  /* Наклон через skew, а не font-style: oblique 15deg — у шрифта нет оси slnt,
     и браузер рисует синтетический наклон под своим углом, игнорируя градусы.
     Скошен только текст: рамка и срезанные углы остаются прямыми. */
  .label {
    display: inline-block;
    transform: skewX(-15deg);
  }

  /* Ссылка — не кнопка: сама она строчная, подчёркнута и прижата к левому краю. */
  a.cut-corner {
    display: inline-block;
    box-sizing: border-box;
    text-align: center;
    text-decoration: none;
  }

  .cut-corner.full-width {
    width: 100%;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>

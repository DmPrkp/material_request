<template>
  <!-- API как у CutCornerBtn: с to — ссылка (переход видит поисковик), без — кнопка. -->
  <router-link
    v-if="to"
    :to="to"
    class="plasma"
    :class="{ 'full-width': fullWidth }"
  >
    <span class="label"><slot></slot></span>
  </router-link>
  <button
    v-else
    class="plasma"
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
  .plasma {
    --slant: 0.5em;

    position: relative;
    overflow: hidden;
    font-size: 1rem;
    padding: 0.4em 1.2em;
    /* У Russo One одно начертание — 400, иначе браузер дорисует синтетический жирный. */
    font-weight: 400;
    color: #fff;
    background: radial-gradient(circle, #f796c0 0%, #76aef1 100%);
    /* Внешние тени clip-path всё равно срежет — остаётся только внутренний блик. */
    box-shadow: inset 2px 2px 2px 0 rgba(255, 255, 255, 0.5);
    transition: opacity 0.3s ease, box-shadow 0.3s ease;
    /* Те же срезанные углы, что у CutCornerBtn: правый верхний и левый нижний. */
    clip-path: polygon(
      0 0,
      calc(100% - var(--slant)) 0,
      100% var(--slant),
      100% 100%,
      var(--slant) 100%,
      0 calc(100% - var(--slant))
    );
  }

  /* Вспышка: полоска раз в 5 с разлетается по диагонали. */
  .plasma::before {
    position: absolute;
    content: "";
    top: -180px;
    left: 0;
    width: 30px;
    height: 100%;
    background-color: #fff;
    animation: shiny-btn 5s ease-in-out infinite;
  }

  .plasma:hover {
    opacity: 0.85;
  }

  .plasma:active {
    box-shadow:
      inset -4px -4px 6px 0 rgba(255, 255, 255, 0.2),
      inset 4px 4px 6px 0 rgba(0, 0, 0, 0.2);
  }

  /* Наклон skew-ом, а не font-style — у шрифта нет оси slnt. Скошен только текст.
     position — чтобы текст был поверх вспышки. */
  .label {
    position: relative;
    display: inline-block;
    transform: skewX(-15deg);
  }

  a.plasma {
    display: inline-block;
    box-sizing: border-box;
    text-align: center;
    text-decoration: none;
  }

  .plasma.full-width {
    width: 100%;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    .plasma::before {
      animation: none;
    }
  }

  @keyframes shiny-btn {
    0% {
      transform: scale(0) rotate(45deg);
      opacity: 0;
    }
    80% {
      transform: scale(0) rotate(45deg);
      opacity: 0.5;
    }
    81% {
      transform: scale(4) rotate(45deg);
      opacity: 1;
    }
    100% {
      transform: scale(50) rotate(45deg);
      opacity: 0;
    }
  }
</style>

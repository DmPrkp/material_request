<template>
  <button
    @click="$emit('click', $event)"
    :class="{ 'full-width': fullWidth }"
    :disabled="disabled"
  >
    <slot></slot>
  </button>
</template>

<script lang="ts" setup>
  interface Props {
    fullWidth?: boolean;
    disabled?: boolean;
  }

  withDefaults(defineProps<Props>(), {
    fullWidth: false,
    disabled: false,
  });

  defineEmits<{
    click: [event: MouseEvent];
  }>();
</script>

<style scoped>
  button {
    --border: 2px;
    --slant: 0.5em;
    --color: var(--ion-color-primary);

    font-size: 1rem;
    padding: 0.4em 1.2em !important;
    font-weight: 900;
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

  button.full-width {
    width: 100%;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>

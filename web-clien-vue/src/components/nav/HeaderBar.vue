<template>
<header>
  <nav class="header-bar">
    <div class="header-bar_items_wrapper">
      <div class="header-bar_logo_wrapper">
        <router-link  class="header-bar_logo" to="/">
          <span>mat</span>
          <span>li</span>
        </router-link>
      </div>
      <LocaleSwitcher />  
      <div class="flex pr-5">
        <MobileMenu @change="$emit('change')"></MobileMenu>
      </div>
    </div>
  </nav>
</header>
</template>

<script setup lang="ts">
  import LocaleSwitcher from '@/components/logicalSwitchers/LocaleSwitcher.vue';
  import MobileMenu from '../ui/MobileMenu.vue';
  import type { Ref } from 'vue';
  
  const emit = defineEmits<{
    (e: 'change', isOpen: Ref<boolean>) : void
  }>()


</script>

<style>
.header-gradient {
  background-image: var(--header-bar-color);
}

.header-shadow {
  box-shadow: -5px 5px 5px 0 grey
}
</style>

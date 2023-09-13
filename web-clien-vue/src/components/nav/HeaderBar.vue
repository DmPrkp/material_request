<template>
<header class="flex justify-end">
  <nav class="header-gradient header-shadow h-14 w-[calc(100%-50px)]">
    <div class="flex justify-between items-center h-full">
      <div class="pl-10">
        <router-link  class="m-0 text-2xl font-bold leading-12" to="/">
          <span class="text-3xl text-[var(--bright-letter)]">test</span>
          <span class="text-2xl text-[var(--main-color)]">test</span>
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

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
      <div class="header-bar_right-side">
        <u-i-mobile-menu @change="$emit('change')"></u-i-mobile-menu>
      </div>
    </div>
  </nav>
</header>
</template>

<script setup lang="ts">
import LocaleSwitcher from '@/components/logicalSwitchers/LocaleSwitcher.vue';
  
  const emit = defineEmits(['change'])
</script>

<style>
header {
  display: flex;
  justify-content: flex-end;
}

.header-bar {
  background: var(--header-bar-color);
  height: 70px;
  width: calc(100% - 50px);
  box-shadow: -5px 5px 5px 0 grey;
}

.header-bar_items_wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-bar_logo {
  margin: 0;
  font-size: 2rem;
  font-weight: bold;
  line-height: 3rem;
}

.header-bar_logo_wrapper {
  padding-left: 10%;
}

.header-bar_right-side {
  display: flex;
  padding-right: 20px;
}

span:first-child {
  color: var(--bright-letter);
}

span:last-child {
  color: var(--main-color);
}

</style>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'NavBar',
});
</script>

<template lang="pug">
  nav
    p
    ul(class="menu-list")
      li
       nuxt-link
      li
        nuxt-link
      li
        nuxt-link
</template>

<style lang="stylus">
.menu-list
  display flex


</style>

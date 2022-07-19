<template lang="pug">
div(class="fill-height")
  bars-header-bar
  main(class="main_container")
    div(class="main_content")
      slot
    bars-nav-bar(:nav-menu="mainMenu")
</template>

<script setup lang="ts">
// import {NavBarInterface} from "~/types";

let mainMenu: NavBarInterface = [
  {link: '/calc', description: 'calc'},
  {link: '/articles', description: 'articles'},
  {link: '/how-to-use', description: 'how to use'},
  {link: '/about-project', description: 'about project'}
];

useHead({
  title: 'matli. materials calculator',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  charset: 'utf-8',
})
</script>

<style lang="stylus">
.main
  &_container
    height calc(100% - 70px)
    display flex
  &_content
    width 100%
    height 100%
    display flex
    justify-content center
    align-items center
</style>
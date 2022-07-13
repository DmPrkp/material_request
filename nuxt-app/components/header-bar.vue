<template lang="pug">
header
  nav(class='header-bar')
    div(class="header-bar_items_wrapper")
      div(class="header-bar_logo_wrapper")
        h1(class="header-bar_logo")
          span mat
          span li
      div
</template>

<script setup lang="ts">



</script>

<style scoped lang="stylus">
.header-bar
  background var(--dark-main-color)
  height 70px
  box-shadow 10px 5px 5px 5px grey
  &_items_wrapper
    display flex
    justify-content space-between
    align-items center
    height 100%
  &_logo
    margin 0
    font-size 2rem
    line-height 2rem
    &_wrapper
      padding-left 140px

span:first-child
  color: var(--bright-letter)

span:last-child
  color: var(--main-color)
</style>

<template lang="pug">
header
  nav(class='header-bar')
    div(class="header-bar_items_wrapper")
      div(class="header-bar_logo_wrapper")
        NuxtLink(class="header-bar_logo" to="/")
          span mat
          span li
      div(class="header-bar_right-side")
        u-i-mobile-menu()
</template>

<script setup lang="ts">

</script>

<style lang="stylus">
header
  display flex
  justify-content flex-end
.header-bar
  background var(--header-bar-color)
  height 70px
  width: calc(100%-50px)
  box-shadow -5px 5px 5px 0 grey
  &_items_wrapper
    display flex
    justify-content space-between
    align-items center
    height 100%
  &_logo
    margin 0
    font-size 2rem
    font-weight bold
    line-height 3rem
    &_wrapper
      padding-left 10%
  &_right-side
    display flex
    padding-right 20px

span:first-child
  color: var(--bright-letter)

span:last-child
  color: var(--main-color)
</style>

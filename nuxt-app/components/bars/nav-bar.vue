<template lang="pug">
nav(class="menu-list_wrapper")
  ul(class="menu-list")
    li(
      v-for="(item) in navMenu"
      class="menu-list_item"
      :class="($route.path.match(item.link)) ? 'menu-list_chosen' : ''"
      )
      nuxt-link(:to="item.link") {{ item.description }}
</template>

<script setup lang="ts">
const props = defineProps({
  navMenu: {
    type: Array
  }
})
</script>

<style lang="stylus">
.menu-list
  width 200px
  list-style-type: none;
  padding 0
  margin 0
  &_item
    padding: 5px 0 5px 20px;
    font-size: 1.4rem
    margin-bottom: 2px
    transition: background 0.25s ease-in, color 0.25s ease-out
    border-bottom 2px solid var(--main-color)
    border-right 20px solid var(--main-color)
  &_chosen
    background var(--main-color)
    display flex
    justify-content flex-start
    align-items center
    //border-right 50px solid var(--main-color)
    //border-bottom 2px solid rgba(0, 0, 0, 0)
    &.menu-list_item
      a
        color: var(--bright-letter)
  &_wrapper
    height 100%
    border-left: 1px solid var(--borders)
    background: var(--nav-bg)
  a
    display block
    color: var(--dark-letter)
</style>

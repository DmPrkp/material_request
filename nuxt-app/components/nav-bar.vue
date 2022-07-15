<template lang="pug">
nav
  ul(class="menu-list")
    li(
      v-for="(item) in navMenu"
      class="menu-list_item"
      :class="($route.path.match(item.link)) ? 'menu-list_chosen' : ''"
      )
      nuxt-link(:to="item.link") {{ item.description }}
</template>

<script setup lang="ts">
const navMenu = [
  {link: '/main', description: 'main'},
  {link: '/calc', description: 'calculator'},
  {link: '/about', description: 'about'},
];
</script>

<style scoped lang="stylus">
.menu-list
  width 200px
  list-style-type: none;
  padding 0
  margin 0
  &_item
    padding: 5px 0 5px 20px;
    font-size: 1.4rem
    margin-bottom: 2px
    transition: background 0.5s ease-in, border 0.5s ease-out
    border-bottom 2px solid var(--main-color)
    border-right 20px solid var(--main-color)
  &_chosen
    background var(--main-color)
    display flex
    justify-content flex-start
    align-items center
    border-right 50px solid var(--main-color)
    border-bottom 2px solid rgba(0, 0, 0, 0)
    a
      color: var(--bright-letter)
  a
    display block
</style>

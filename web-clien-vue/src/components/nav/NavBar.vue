<template>
  <nav class="menu-list_wrapper" :class="{'menu-list_fixed-wrapper': isMobile}">
    <ul class="menu-list">
      <li v-for="item in mainMenu" :key="item.description" class="menu-list_item">
        <router-link :to="getLocalizedRoute(item.name)">
          {{ item.description }}
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import injectI18nToRoute from '@/mixins/injectI18nToRoute';

const route = useRoute();
const locale = route.params.locale || import.meta.env.VITE_DEFAULT_LOCALE;

const getLocalizedRoute = (routeName: string) => {
  return injectI18nToRoute(routeName, locale);
};

const mainMenu = [
  { name: 'calc', description: 'calc' },
  { name: 'about-project', description: 'about project' }
];

const isMobile = true;
</script>

  
<style>
.menu-list {
  width: 200px;
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.menu-list_item {
  padding: 5px 0 5px 20px;
  font-size: 1.4rem;
  margin-bottom: 2px;
  transition: background 0.25s ease-in, color 0.25s ease-out;
  border-bottom: 2px solid var(--main-color);
  border-right: 20px solid var(--main-color);
}

.menu-list_chosen {
  background: var(--main-color);
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.menu-list_item.menu-list_item a {
color: var(--bright-letter);
}
.menu-list_wrapper {
  height: 100%;
  border-left: 1px solid var(--borders);
  background: var(--nav-bg);
}

.menu-list_fixed-wrapper {
  position: fixed;
  right: 0;
  z-index: 1000;
}

a {
  display: block;
  color: var(--dark-letter);
}
</style>

<!-- <style lang="stylus">
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
    &_fixed-wrapper
      position: fixed
      right: 0
      z-index 1000
    a
      display block
      color: var(--dark-letter)
</style> -->


  
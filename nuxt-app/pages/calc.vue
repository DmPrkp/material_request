<template lang="pug">
div(class="fill-height")
  h1 MATLI advanced building material calc.
  cards-main-card(v-for="item in mainCardsItems", :key='item.name', :main-card="item" )
</template>

<script setup lang="ts">
const mainCardsItems = [
  {
    name: 'facade',
    img: 'https://image.shutterstock.com/image-photo/typical-house-facade-wet-laundry-260nw-2063305526.jpg',
    childs: [
      { name: 'Мокрый фасад', description: 'wet facade', img: '/facade-wet.jpg'},
      { name: 'Вент фасад', description: 'curtain facade', img: '/facade-wet.jpg'},
      { name: 'Кирпичный фасад', description: 'brick facade', img: '/facade-wet.jpg'},
    ]
  }
];
</script>

<style scoped>

</style>
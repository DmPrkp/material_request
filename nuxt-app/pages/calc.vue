<template lang="pug">
div(class="fill-height")
  //h1 MATLI advanced building material calc.
  h1 Test test test
  cards-main-card(v-for="item in mainCardsItems", :key='item.name', :main-card="item" )
</template>

<script setup lang="ts">
const mainCardsItems = [
  {
    name: 'facade',
    img: 'https://image.shutterstock.com/image-photo/typical-house-facade-wet-laundry-260nw-2063305526.jpg',
    itemColor: '#2aaac1',
    childs: [
      { name: 'Мокрый фасад', description: 'wet facade', img: '/facade-wet.jpg'},
      { name: 'Вент фасад', description: 'curtain facade', img: '/facade-wet.jpg'},
      { name: 'Кирпичный фасад', description: 'brick facade', img: '/facade-wet.jpg'},
    ]
  }
];
</script>

<!--#ff62b2-->
<!--#2aaac1-->
<!--#fa7f67-->
<!--#00b97c-->

<style scoped>

</style>
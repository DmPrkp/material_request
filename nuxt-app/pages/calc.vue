<template lang="pug">
div
  h1 MATLI advanced building material calc.
  cards-main-card(v-for="item in mainCardsItems", :key='item.name', :main-card="item" )
</template>

<script setup lang="ts">
const mainCardsItems = [
  {
    name: 'facade',
    img: 'https://image.shutterstock.com/image-photo/typical-house-facade-wet-laundry-260nw-2063305526.jpg',
    childs: [
      { name: 'Мокрый фасад', description: 'wet facade', img: 'https://kz.all.biz/img/kz/service_catalog/114795.jpeg'},
      { name: 'Вент фасад', description: 'curtain facade', img: 'https://kz.all.biz/img/kz/service_catalog/114795.jpeg'},
      { name: 'Кирпичный фасад', description: 'brick facade', img: 'https://thumbs.dreamstime.com/z/facade-old-brick-building-windows-cornices-walls-176264318.jpg'},
    ]
  }
];
</script>

<style scoped>

</style>
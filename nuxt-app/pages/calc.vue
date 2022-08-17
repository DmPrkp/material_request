<template lang="pug">
div(class="fill-height fill-width")
  //h1 MATLI advanced building material calc.
  h1 Test test test
  div(
    style='display: flex'
    v-if="!isMobile"
    )
    .col-6.col-sm-3(v-for="item in mainCardsItems", :key='item.name')
      cards-main-card(:main-card="item")
  div(
    style='display: flex'
    v-if="isMobile"
    )
    .col-6.col-sm-3(v-for="item in mainCardsItems", :key='item.name')
      cards-main-card(:main-card="item")
</template>

<script setup lang="ts">
const isMobile = inject('isMobile')

const mainCardsItems = [
  {
    name: 'facade',
    img: '/cards/facade.svg',
    color: '#2aaac1',
    gradient: 'linear-gradient(to bottom, #47c2d7, #279eb2)',
    childs: [
      { name: 'Мокрый фасад', description: 'wet facade', img: '/facade-wet.jpg'},
      { name: 'Вент фасад', description: 'curtain facade', img: '/facade-wet.jpg'},
      { name: 'Кирпичный фасад', description: 'brick facade', img: '/facade-wet.jpg'},
    ]
  },
  {
    name: 'roof',
    img: '/cards/facade.svg',
    color: '#ff62b2',
    gradient: 'linear-gradient(to bottom, #ff73b9, #ff40a1)',
    childs: [
      { name: 'Мокрый фасад', description: 'wet facade', img: '/facade-wet.jpg'},
      { name: 'Вент фасад', description: 'curtain facade', img: '/facade-wet.jpg'},
      { name: 'Кирпичный фасад', description: 'brick facade', img: '/facade-wet.jpg'},
    ]
  },
  {
    name: 'inner',
    img: '/cards/facade.svg',
    color: '#ff62b2',
    gradient: 'linear-gradient(to bottom, #ff73b9, #ff40a1)',
    childs: [
      { name: 'Мокрый фасад', description: 'wet facade', img: '/facade-wet.jpg'},
      { name: 'Вент фасад', description: 'curtain facade', img: '/facade-wet.jpg'},
      { name: 'Кирпичный фасад', description: 'brick facade', img: '/facade-wet.jpg'},
    ]
  },
];
</script>

#fa7f67
#00b97c

<style scoped>

</style>
<template lang="pug">
div(class="fill-height")
  //h1 MATLI advanced building material calc.
  h1 Test test test
  div(v-if="intFrameWidth >= 800")
    cards-main-card(v-for="item in mainCardsItems", :key='item.name', :main-card="item" )
  div(v-if="intFrameWidth < 800")
    cards-main-card(v-for="item in mainCardsItems", :key='item.name', :main-card="item" )
</template>

<script setup lang="ts">
const intFrameWidth = inject('intFrameWidth')

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
  }
];
</script>

#ff62b2
#fa7f67
#00b97c

<style scoped>

</style>
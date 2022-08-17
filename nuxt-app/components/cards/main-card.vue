<template>
<!--      <section class="card-section">-->
        <div class="card" :class="{'card__is-choosed': isChoosed}" @click="chooseCard">
          <div class="flip-card">
            <div class="flip-card__container">
              <div class="card-front">
                <div class="card-front__tp" :style="{background: mainCard.gradient}">
                  <img class="card-front__icon" :src="mainCard.img" :alt="mainCard.name">
<!--                  <h2 v-else class="card-front__heading">  {{mainCard.name}}  </h2>-->
<!--                  <p class="card-front__text-price">  From £29  </ p>-->
                </div>

                <div class="card-front__bt">
                  <p class="card-front__text-view" :style="{color: mainCard.color}">
                    {{ mainCard.name }}
                  </p>
                </div>
              </div>
              <div class="card-back" :style="{color: mainCard.color}">
                <h2 class="card-back__heading">  {{ mainCard.name }}  </h2>
              </div>
            </div>
          </div>

          <div class="inside-page"
            :class="{
              'inside-page__chosen': isChoosed
            }">
            <div class="inside-page__container" v-for="item of mainCard.childs" :key="item.description">
              <h3 class="inside-page__heading">
                {{item.name}}
              </h3>
              <p class="inside-page__text">
                {{item.description}}
              </p>
              <a @click.stop="test" href="#" class="inside-page__btn inside-page__btn--city">View deals</a>
            </div>
          </div>
        </div>
<!--      </section>-->
</template>

<script setup lang="ts">
const props = defineProps({
  mainCard: {
    type: Object
  }
})

const isChoosed = ref(false)

function test() {  console.log('test')}

function chooseCard() {
  isChoosed.value = !isChoosed.value
}
</script>

<style scoped>
/* CSS reset */
*,
*::after,
*::before {
  box-sizing: inherit;
  margin: 0;
  padding: 0;
}

/* Main heading for card's front cover */
/*.card-front__heading {*/
/*  font-size: 1.5rem;*/
/*  margin-top: .25rem;*/
/*}*/

/* Main heading for inside page */
.inside-page__heading {
  padding-bottom: 1rem;
  width: 100%;
}

/* Mixed */

/* For both inside page's main heading and 'view me' text on card front cover */
.inside-page__heading,
.card-front__text-view {
  font-size: 1.3rem;
  font-weight: 800;
  margin-top: .2rem;
  margin-bottom: .5rem;
}

/*.inside-page__heading--city,*/
/*.card-front__text-view--city { color: #ff62b2; }*/

/*.inside-page__heading--ski,*/
/*.card-front__text-view--ski { color: #2aaac1; }*/

/*.inside-page__heading--beach,*/
/*.card-front__text-view--beach { color: #fa7f67; }*/

/*.inside-page__heading--camping,*/
/*.card-front__text-view--camping { color: #00b97c; }*/

/* Front cover */

/*.card-front__tp { color: var(--main-bg); }*/

/* For pricing text on card front cover */
/*.card-front__text-price {*/
/*  font-size: 1.2rem;*/
/*  margin-top: -.2rem;*/
/*}*/

/* Back cover */

/* For inside page's body text */
.inside-page__text {
  color: #333;
}

/* Icons ===========================================*/

.card-front__icon {
  fill: var(--main-bg);
  height: 6rem;
  margin-top: -0.75rem;
}

/* Buttons =================================================*/

.inside-page__btn {
  background-color: transparent;
  border: 3px solid;
  border-radius: .5rem;
  font-size: 1.2rem;
  font-weight: 600;
  margin-top: 2rem;
  overflow: hidden;
  padding: .7rem .1rem;
  position: relative;
  text-decoration: none;
  transition: all .3s ease;
  width: 90%;
  z-index: 10;
}

.inside-page__btn::before {
  content: "";
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  transform: scaleY(0);
  transition: all .3s ease;
  width: 100%;
  z-index: -1;
}

.inside-page__btn--city {
  border-color: #ff40a1;
  color: #ff40a1;
}

.inside-page__btn--city::before {
  background-color: #ff40a1;
}

.inside-page__btn:hover::before {
  transform: scaleY(1);
}

/* Layout Structure=========================================*/

/*.main {*/
/*  background: linear-gradient(*/
/*      to bottom right,*/
/*      #eee8dd,*/
/*      #e3d9c6*/
/*  );*/
/*  display: flex;*/
/*  flex-direction: column;*/
/*  justify-content: center;*/
/*  height: 100vh;*/
/*  width: 100%;*/
/*}*/

/* Container to hold all cards in one place */
/*.card-area {*/
/*  align-items: center;*/
/*  display: flex;*/
/*  flex-wrap: nowrap;*/
/*  height: 100%;*/
/*  justify-content: space-evenly;*/
/*  padding: 1rem;*/
/*}*/

/* Card ============================================*/

/* Area to hold an individual card */
/*.card-section {*/
/*  align-items: center;*/
/*  display: flex;*/
/*  height: 100%;*/
/*  justify-content: center;*/
/*  width: 100%;*/
/*}*/

.card {
  background-color: rgba(0,0,0, .05);
  box-shadow: -0.1rem 1.7rem 6.6rem -3.2rem rgba(0,0,0,0.5);
  height: 150px;
  position: relative;
  transition: all 1s ease;
  width: 150px;
  --card-back: 3rem;
}


.flip-card {
  height: 150px;
  /*perspective: 100rem;*/
  position: absolute;
  /* right: 0; */
  transition: all 1s ease;
  visibility: hidden;
  width: 150px;
  z-index: 100;
}


.flip-card > * {
  visibility: visible;
}


.flip-card__container {
  height: 100%;
  position: absolute;
  /* right: 0; */
  transform-origin: left;
  transform-style: preserve-3d;
  transition: all 1s ease;
  width: 100%;
}

.card-back {
  position: absolute;
  backface-visibility: hidden;
  height: var(--card-back);
  left: 0;
  top: 12rem;
  width: 100%;
}

.card-front {
  backface-visibility: hidden;
  left: 0;
  position: absolute;
  top: 0;
  background-color: var(--main-bg);
  /*height: 150px;*/
  width: 150px;
}

.card-front__tp {
  color: var(--main-bg);
  align-items: center;
  clip-path: polygon(0 0, 100% 0, 100% 90%, 57% 90%, 50% 100%, 43% 90%, 0 90%);
  display: flex;
  flex-direction: column;
  height: 8rem;
  justify-content: center;
  padding: .75rem;
}

/*.card-front__tp--city {*/
/*  background: linear-gradient(*/
/*      to bottom,*/
/*      #ff73b9,*/
/*      #ff40a1*/
/*  );*/
/*}*/


.card-front__bt {
  align-items: center;
  display: flex;
  justify-content: center;
}

.card-back {
  background-color: var(--main-bg);
  transform: rotateX(180deg) translate(0px, 60px);
  display: flex;
  justify-content: center;
  align-items: center;
}

/*.video__container {*/
/*  clip-path: polygon(0% 0%, 100% 0%, 90% 50%, 100% 100%, 0% 100%);*/
/*  height: auto;*/
/*  min-height: 100%;*/
/*  object-fit: cover;*/
/*  width: 100%;*/
/*}*/

.inside-page {
  display: flex;
  flex-flow: column;
  background-color: var(--main-bg);
  box-shadow: inset 20rem 0 5rem -2.5rem rgba(0,0,0,0.25);
  height: 150px;
  /*padding: 1rem;*/
  position: absolute;
  margin-top: 0;
  left: 0;
  transition: all 1s ease;
  /*width: 150px;*/
  z-index: 1;
  width: 150px;
}

.inside-page__chosen {
  margin-top: var(--card-back);
  height: 100%
}

.inside-page__chosen > div {
    position: static;
  }

.inside-page__container {
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  text-align: center;
  width: 100%;
  position: absolute;
  left: 0;
  transition: position 1s ease;
}

/* Functionality ====================================*/

.card.card__is-choosed {
  box-shadow:
      -.1rem 1.7rem 6.6rem -3.2rem rgba(0,0,0,0.75);
  height: 30rem;
}

.card.card__is-choosed .flip-card__container {
  transform: rotateX(180deg);
}

.card.card__is-choosed .inside-page {
  box-shadow: inset 1rem 0 5rem -2.5rem rgba(0,0,0,0.1);
}
</style>
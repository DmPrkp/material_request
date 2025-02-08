<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-accordion-group expand="inset">
        <ion-accordion
          v-for="item in aboutContent"
          :key="item.title"
          :toggle-icon="caretDownCircle"
          :value="item.title"
        >
          <ion-item
            slot="header"
            color="medium"
          >
            <ion-label>{{ item.title }}</ion-label>
          </ion-item>
          <div
            v-if="item.body.paragraphs"
            class="ion-padding"
            slot="content"
          >
            <p
              v-for="(p, index) in item.body.paragraphs"
              :key="index"
            >
              {{ p }}
            </p>
          </div>
          <div
            v-if="item.body.items"
            class="ion-padding"
            slot="content"
          >
            <ion-item
              v-for="i in item.body.items"
              :key="i.desc"
            >
              <ion-thumbnail slot="start">
                <img
                  :src="`about/${i.img}`"
                  :alt="i.img"
                />
              </ion-thumbnail>

              <ion-label>
                <a
                  v-if="i.link"
                  :href="`https://${i.link}`"
                >
                  {{ i.linkDesc || i.link }}</a
                >
                {{ i.desc }}
              </ion-label>
            </ion-item>
          </div>
        </ion-accordion>
      </ion-accordion-group>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
  import {
    IonAccordion,
    IonAccordionGroup,
    IonItem,
    IonLabel,
  } from "@ionic/vue";
  import { caretDownCircle } from "ionicons/icons";
  import { AboutAccordionItem } from "./types/about";

  const aboutContent: AboutAccordionItem[] = [
    {
      title: "Задачи проекта",
      body: {
        paragraphs: [
          "Проект создан для примерного подсчета материалов необходимого для выполнения работ по строительству. Точный объем вы можете указать самостоятельно, зная специфику своего объекта.",
          "Основная задача помочь прорабам, мастерам, бригадирам, звеньевым, рабочим выполнять их очень сложную рискованную работу за которую им явно не доплачивают;), а зачастую и просто кидают на деньги:(",
          `В проекте сознательно указанно количество некоторых материалов равное нулю. 
          Так как из за отличия разных объектов друг от друга их необходимо указывать вручную. 
          Они указанны для того чтоб вы не забыли о них при формировании заявки на материалы. 
          Так же из за этого некоторые позиции указанны избыточно. Так как удалить их проще чем вспомнить и добавить.`,
          "Удачных вам строительных работ!",
        ],
      },
    },
    {
      title: "Спасибо от проекта",
      body: {
        items: [
          {
            img: "shedevrum.jpg",
            desc: "Генерация картинок от Yandex",
            link: "shedevrum.ai",
            linkDesc: "Shedevrum",
          },
          {
            img: "vue.jpg",
            desc: "Opensource веб фрэмворк",
            link: "vuejs.org",
            linkDesc: "Vue.js",
          },
          {
            img: "nginx.jpg",
            desc: "Opensource веб сервер",
            link: "nginx.org",
            linkDesc: "Nginx",
          },
          {
            img: "node.jpg",
            desc: "Opensource runtime для исполнения языка Java Script",
            link: "nodejs.org",
            linkDesc: "Node.js",
          },
          {
            img: "docker.jpg",
            desc: "Контейнеризация сервисов",
            link: "docker.com",
            linkDesc: "Docker",
          },
        ],
      },
    },
  ];
</script>

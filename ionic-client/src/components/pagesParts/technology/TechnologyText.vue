<template>
  <!--
    Под калькулятором, без аккордеонов и заголовка «О технологии»: считать — главное
    на странице, текст — для тех, кто долистал, и для поисковика. Текст — из словаря
    (правится в админке); тот же текст nginx клиента вставляет в HTML страницы
    (docker/nginx.conf, SSI), так что у робота и человека он совпадает.
  -->
  <section v-if="sections.length" class="technology_text">
    <template v-for="(section, index) in sections" :key="index">
      <h2 v-if="section.title">{{ section.title }}</h2>
      <p v-for="paragraph in section.paragraphs" :key="paragraph">
        {{ paragraph }}
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
  import { computed } from "vue";
  import { parseArticle } from "./article";

  const props = defineProps<{ text: string | null | undefined }>();

  const sections = computed(() => parseArticle(props.text));
</script>

<style>
  .technology_text {
    padding: 8px 16px 32px;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .technology_text h2 {
    margin: 24px 0 8px;
    font-size: 1.05rem;
    line-height: 1.3;
  }

  .technology_text p {
    margin: 0 0 8px;
  }
</style>

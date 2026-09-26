import { createHead } from "@vueuse/head";

/** Один экземпляр на приложение: его ставит main.ts, а SEO роутера (router/seo.ts) патчит. */
export const head = createHead();

import { createApp, watch } from "vue";
import { createHead } from "@vueuse/head";
import { createPinia } from "pinia";
import {
  IonicVue,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonRouterOutlet,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonToggle,
  IonText,
  IonPage,
  IonButton,
  IonItemDivider,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonCardSubtitle,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from "@ionic/vue";
import App from "./App.vue";
import router from "./router";
import MaterialList from "./components/pagesParts/materials/MaterialList.vue";

import i18n from "./plugins/i18n";

/* Core CSS required for Ionic components to work properly */
import "@ionic/vue/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/vue/css/normalize.css";
import "@ionic/vue/css/structure.css";
import "@ionic/vue/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/vue/css/padding.css";
import "@ionic/vue/css/float-elements.css";
import "@ionic/vue/css/text-alignment.css";
import "@ionic/vue/css/text-transformation.css";
import "@ionic/vue/css/flex-utils.css";
import "@ionic/vue/css/display.css";

/* Theme variables */
import "./theme/variables.css";

/* Шрифт из npm, а не с Google Fonts: файлы уходят в бандл и раздаются нашим nginx.
   unicode-range в пакете — браузер качает только нужные подмножества (кириллица, латиница). */
import "@fontsource/russo-one";

import { applyInitialTheme } from "./plugins/theme";
import BaseModel from "./models/BaseModel";
import AuthModel from "./models/AuthModel";
import { useAuthStore } from "./store/auth";
import { AUTH_ENABLED } from "./constants/auth";
import { claimAnonymous } from "./models/zayavka/claimAnonymous";

const head = createHead();
const pinia = createPinia();
// Тема не привязана к странице настроек: применяем до монтирования.
applyInitialTheme();
BaseModel.setBaseUrl();
const defaultBaseUrl = BaseModel.baseURL;
AuthModel.setBaseUrl(
  import.meta.env.VITE_USER_API_ORIGIN ||
    import.meta.env.VITE_AUTH_API_ORIGIN ||
    defaultBaseUrl
);
const authStore = useAuthStore(pinia);
// Сессию из localStorage поднимаем и при выключенном флаге: он отключает только
// проверку в гварде, а значок «не авторизован» в шапке должен видеть реальный вход.
authStore.initialize();
if (authStore.isAuthenticated) {
  authStore.fetchProfile().catch(() => undefined);
}
// Заявки, заведённые без входа, на сервере ничьи — после входа забираем их себе
// по ключам из браузера. immediate: ключи могли остаться и у того, кто уже вошёл.
watch(
  () => authStore.token,
  (token) => {
    if (token) void claimAnonymous();
  },
  { immediate: true }
);

router.beforeEach(async (to) => {
  // Авторизация выключена флагом — пускаем везде, проверку не трогаем.
  if (!AUTH_ENABLED) return true;

  const requiresAuth = to.meta?.requiresAuth !== false;
  const localeParam =
    typeof to.params.locale === "string"
      ? to.params.locale
      : import.meta.env.VITE_DEFAULT_LOCALE;

  if (!requiresAuth) {
    if (to.name === "auth" && authStore.isAuthenticated) {
      const redirectTarget =
        typeof to.query.redirect === "string"
          ? (to.query.redirect as string)
          : `/${localeParam}/zayavka`;
      return redirectTarget;
    }
    return true;
  }

  if (!authStore.isAuthenticated) {
    return {
      name: "auth",
      params: { locale: localeParam },
      query: { redirect: to.fullPath },
    };
  }

  if (!authStore.user) {
    try {
      await authStore.fetchProfile();
    } catch {
      return {
        name: "auth",
        params: { locale: localeParam },
        query: { redirect: to.fullPath },
      };
    }
  }

  return true;
});

const app = createApp(App)
  .use(IonicVue)
  .use(head)
  .use(pinia)
  .use(i18n)
  .use(router)
  .component("IonContent", IonContent)
  .component("IonRefresher", IonRefresher)
  .component("IonRefresherContent", IonRefresherContent)
  .component("IonTitle", IonTitle)
  .component("IonRouterOutlet", IonRouterOutlet)
  .component("IonList", IonList)
  .component("IonItemDivider", IonItemDivider)
  .component("IonItem", IonItem)
  .component("IonLabel", IonLabel)
  .component("IonInput", IonInput)
  .component("IonToggle", IonToggle)
  .component("IonText", IonText)
  .component("IonPage", IonPage)
  .component("IonButton", IonButton)
  .component("IonCard", IonCard)
  .component("IonCardHeader", IonCardHeader)
  .component("IonCardTitle", IonCardTitle)
  .component("IonCardContent", IonCardContent)
  .component("IonCardSubtitle", IonCardSubtitle)
  .component("IonSegment", IonSegment)
  .component("IonSegmentButton", IonSegmentButton)
  .component("IonSpinner", IonSpinner)
  .component("MaterialList", MaterialList);

router.isReady().then(() => {
  app.mount("#app");
});

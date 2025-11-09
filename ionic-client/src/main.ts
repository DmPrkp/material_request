import { createApp } from "vue";
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

import BaseModel from "./models/BaseModel";
import AuthModel from "./models/AuthModel";
import { useAuthStore } from "./store/auth";

const head = createHead();
const pinia = createPinia();
BaseModel.setBaseUrl();
const defaultBaseUrl = BaseModel.baseURL;
AuthModel.setBaseUrl(
  import.meta.env.VITE_USER_API_ORIGIN ||
    import.meta.env.VITE_AUTH_API_ORIGIN ||
    defaultBaseUrl
);
const authStore = useAuthStore(pinia);
authStore.initialize();
if (authStore.isAuthenticated) {
  authStore.fetchProfile().catch(() => undefined);
}

router.beforeEach(async (to) => {
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
          : `/${localeParam}/main`;
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
    } catch (error) {
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

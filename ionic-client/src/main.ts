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

const head = createHead();
const pinia = createPinia();
BaseModel.setBaseUrl();

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
  .component("MaterialList", MaterialList);

router.isReady().then(() => {
  app.mount("#app");
});

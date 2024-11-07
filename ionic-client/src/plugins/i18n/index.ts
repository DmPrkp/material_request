import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import ru from "./locales/ru.json";

export default createI18n({
  legacy: false,
  locale: import.meta.env.VITE_RU_LOCALE,
  fallbackLocale: import.meta.env.VITE_EN_LOCALE,
  globalInjection: true,
  messages: {
    ru,
    en,
  },
});

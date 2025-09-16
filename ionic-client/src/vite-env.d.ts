/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  //   readonly VITE_DEFAULT_LOCALE: "ru";
  readonly VITE_DEFAULT_LOCALE: LocaleTypes;
  //   readonly VITE_RU_LOCALE: "ru";
  readonly VITE_RU_LOCALE: string;
  //   readonly VITE_EN_LOCALE: "en";
  readonly VITE_EN_LOCALE: string;
  readonly VITE_PROTOCOL: string;
  readonly VITE_BASE_HOST: string;
  readonly VITE_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

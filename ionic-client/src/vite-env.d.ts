/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: any;
  //   readonly VITE_DEFAULT_LOCALE: "ru";
  readonly VITE_DEFAULT_LOCALE: any;
  //   readonly VITE_RU_LOCALE: "ru";
  readonly VITE_RU_LOCALE: any;
  //   readonly VITE_EN_LOCALE: "en";
  readonly VITE_EN_LOCALE: any;
  readonly VITE_PROTOCOL: any;
  readonly VITE_BASE_HOST: any;
  readonly VITE_PORT: any;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

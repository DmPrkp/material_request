import legacy from "@vitejs/plugin-legacy";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VitePWA({
      strategies: "injectManifest",
      srcDir: "public",
      filename: "manifest.json",
      devOptions: {
        enabled: true,
      },
    }),
    vue(),
    legacy(),
  ],
  // define: {
  //   __VUE_I18N_FULL_INSTALL__: 'false',
  //   __VUE_I18N_LEGACY_API__: 'false',
  //   // __INTLIFY_PROD_DEVTOOLS__: 'false',
  // },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      vue: "vue/dist/vue.esm-bundler.js",
    },
  },
  build: {
    // outDir: "../web-server/ionic-client",
    outDir: "./build",
  },
});

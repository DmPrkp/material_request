// import legacy from "@vitejs/plugin-legacy";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig, UserConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // legacy()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      vue: "vue/dist/vue.esm-bundler.js",
    },
  },
  preview: {
    allowedHosts: ['ionic-client']
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ['ionic-client']
  },
  test: {
    globals: true,
    environment: "jsdom",
  }
} as UserConfig);

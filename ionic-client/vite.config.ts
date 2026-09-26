// import legacy from "@vitejs/plugin-legacy";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig, UserConfig } from "vite";
import { seoPrerender } from "./seo-prerender";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    seoPrerender(),
    // legacy()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy()
  ],
  // define: {
  //   __VUE_I18N_FULL_INSTALL__: 'false',
  //   __VUE_I18N_LEGACY_API__: 'false',
  //   // __INTLIFY_PROD_DEVTOOLS__: 'false',
  // },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'vue': 'vue/dist/vue.esm-bundler.js'
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  },
  build: {
    outDir: '../web-server/ionic-client'
  }
})

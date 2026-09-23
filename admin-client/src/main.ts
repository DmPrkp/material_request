import 'primeicons/primeicons.css';
import './style.css';

import Aura from '@primeuix/themes/aura';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import PrimeVue from 'primevue/config';
import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';

// Community-модули целиком: админке нужны почти все, а размер бандла здесь неважен.
ModuleRegistry.registerModules([AllCommunityModule]);

createApp(App)
  .use(router)
  .use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: 'system' } } })
  .mount('#app');

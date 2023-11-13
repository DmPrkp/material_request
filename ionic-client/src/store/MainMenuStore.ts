import { defineStore } from 'pinia';
import { MainMenuItem } from '../../../shared-types/controller/main-menu';

interface StateMainMenu {
  mainMenu: Array<MainMenuItem>,
  status: 'none' | 'upload'
}

export const useMainMenuStore = defineStore('main-menu', {
  state: () : StateMainMenu => ({ mainMenu: [], status: 'none' }),
  actions: {
    defineMeinMenu(mainMenu: Array<MainMenuItem>): void {
      if (!mainMenu.length) return;
      this.mainMenu = mainMenu;
      this.status = 'upload';
    },
    clearMeinMenu() {
      this.mainMenu = [];
      this.status = 'none';
    },
  },
});

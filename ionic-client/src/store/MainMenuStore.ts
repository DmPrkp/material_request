import { defineStore } from "pinia";
import { MainMenuItem } from "../../types/controller/main-menu";
import { StateMainMenu } from "./types";

export const useMainMenuStore = defineStore("main-menu", {
  state: (): StateMainMenu => ({ mainMenu: [], status: "none" }),
  actions: {
    defineMeinMenu(mainMenu: Array<MainMenuItem>): void {
      if (!mainMenu || !mainMenu.length) return;
      this.mainMenu = mainMenu;
      this.status = "upload";
    },
    clearMeinMenu() {
      this.mainMenu = [];
      this.status = "none";
    },
  },
});

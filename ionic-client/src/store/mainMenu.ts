import { defineStore } from "pinia";
import { StateMainMenu } from "./types";
import { MainMenuItem } from "@/types/controller/main-menu";

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

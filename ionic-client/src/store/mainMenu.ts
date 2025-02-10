import { defineStore } from "pinia";
import { MainMenuItem } from "@/types/controller/main-menu";
import { MAIN_MENU } from "@/constants";

export const useMainMenuStore = defineStore("main-menu", {
  state: (): MainMenuItem[] => MAIN_MENU,
});

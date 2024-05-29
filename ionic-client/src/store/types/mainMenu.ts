import { MainMenuItem } from "../../../types/controller/main-menu";

export interface StateMainMenu {
  mainMenu: Array<MainMenuItem>;
  status: "none" | "upload";
}

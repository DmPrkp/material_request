import { ImageType } from "../entity/image";

export type MainMenuItem = {
  img: ImageType;
  title: string;
  description: string;
  items?: MainMenuItem[];
};

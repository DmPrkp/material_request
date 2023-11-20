import { ImageType } from '../entity/image';

type MainMenuItem = {
  img: ImageType;
  title: string;
  description: string;
  items?: MainMenuItem[]
};

export { MainMenuItem };

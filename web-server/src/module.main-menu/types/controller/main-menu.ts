export type MainMenuItem = {
  img: ImageType;
  title: string;
  description: string;
  items?: MainMenuItem[];
};

type ImageType = {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
};

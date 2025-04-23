import { EIFS_FACADE_SYSTEM, FRAME_SCAFFOLD_SYSTEM, FLAT_ROOF_SYSTEM } from './systems';

const FACADE_MENU = {
  id: 1,
  title: 'facade',
  description: 'facade items',
  img: {
    src: '/main-menu/facade-main-narrow.jpg',
    alt: 'facade-main',
    width: 150,
  },
  items: [EIFS_FACADE_SYSTEM, FRAME_SCAFFOLD_SYSTEM],
};

const ROOF_MENU = {
  id: 2,
  title: 'roof',
  description: 'roof items',
  img: {
    src: '/main-menu/roof-main-narrow.jpg',
    alt: 'roof-main',
    width: 150,
  },
  disable: true,
  items: [FLAT_ROOF_SYSTEM],
};

const INTERIOR_MENU = {
  id: 3,
  title: 'interior',
  description: 'interior items',
  img: {
    src: '/main-menu/interior-main-narrow.jpg',
    alt: 'interior-main',
    width: 150,
  },
  disable: true,
  items: [],
};

export const MAIN_MENU = [FACADE_MENU, ROOF_MENU, INTERIOR_MENU];

import { EIFS_FACADE_SYSTEM, FLAT_ROOF_SYSTEM } from './systems';

const FACADE_MENU = {
  id: 1,
  title: 'facade',
  description: 'facade items',
  img: {
    src: '/main-menu/facade-main-narrow.jpg',
    alt: 'facade-main',
    width: 150,
  },
  items: [EIFS_FACADE_SYSTEM],
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
  items: [FLAT_ROOF_SYSTEM],
};

export const MAIN_MENU = [FACADE_MENU, ROOF_MENU];

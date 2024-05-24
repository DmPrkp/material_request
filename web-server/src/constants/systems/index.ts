export const FLAT_ROOF_SYSTEM = {
  id: 1,
  title: 'flat',
  description: 'flat roofs',
  img: {
    src: '/system/flat-roof.jpg',
    alt: 'flat-roof',
  },
} as const;

export const EIFS_FACADE_SYSTEM = {
  id: 2,
  title: 'EIFS',
  description: 'Exterior Insulation Finishing System',
  img: {
    src: '/system/wet-facade-narrow.jpg',
    alt: 'wet-facade',
  },
} as const;

export const SYSTEMS = [EIFS_FACADE_SYSTEM, FLAT_ROOF_SYSTEM];

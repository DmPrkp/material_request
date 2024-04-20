import { Controller, Get } from '@nestjs/common';
import { MainMenuItem } from 'types/controller/main-menu';

@Controller('main-menu')
export class MainMenuController {
  @Get()
  findAll(): Array<MainMenuItem> {
    return [
      {
        title: 'facade',
        description: 'facade items',
        img: {
          src: '/main-menu/facade-main-narrow.jpg',
          alt: 'facade-main',
          width: 150,
        },
        items: [
          {
            title: 'EIFS',
            description: 'Exterior Insulation Finishing System',
            img: {
              src: '/main-menu/wet-facade-narrow.jpg',
              alt: 'wet-facade',
            },
          },
        ],
      },
      {
        title: 'roof',
        description: 'roof items',
        img: {
          src: '/main-menu/roof-main-narrow.jpg',
          alt: 'roof-main',
          width: 150,
        },
        items: [
          {
            title: 'flat',
            description: 'flat roofs',
            img: {
              src: '/main-menu/flat-roof.jpg',
              alt: 'flat-roof',
            },
          },
        ],
      },
    ];
  }
}

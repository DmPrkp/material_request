import { Controller, Get } from '@nestjs/common';
import { MainMenuItem } from '../../../shared-types/controller/main-menu';

@Controller('main-menu')
export class MainMenuController {
  @Get()
  findAll(): Array<MainMenuItem> {
    return [
      {
        title: 'facades',
        description: 'facades items',
        img: {
          src: '/main-menu/house1.jpg',
          alt: 'house1',
          width: 150,
        },
      },
      {
        title: 'roofs',
        description: 'roofs items',
        img: {
          src: '/main-menu/house2.jpg',
          alt: 'house2',
          width: 150,
        },
      },
    ];
  }
}

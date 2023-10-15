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
          src: '/main-menu/facade-main.jpg',
          alt: 'facade-main',
          width: 150,
        },
      },
      {
        title: 'roofs',
        description: 'roofs items',
        img: {
          src: '/main-menu/roof-main.jpg',
          alt: 'roof-main',
          width: 150,
        },
      },
    ];
  }
}

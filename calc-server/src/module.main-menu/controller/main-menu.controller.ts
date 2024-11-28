import { Controller, Get } from '@nestjs/common';
import { MainMenuItem } from '../types/controller/main-menu';
import { MAIN_MENU } from '~/constants';

@Controller('main-menu')
export class MainMenuController {
  @Get()
  findAll(): Array<MainMenuItem> {
    return MAIN_MENU;
  }
}

import { Module } from '@nestjs/common';
import { MainMenuController } from './controller/main-menu/main-menu.controller';
import { SystemComponentsController } from './controller/system-components/system-components.controller';

@Module({
  controllers: [MainMenuController, SystemComponentsController],
})
export class AppModule {}

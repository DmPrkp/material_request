import { Module } from '@nestjs/common';
import { MainMenuController } from './controller/main-menu.controller';

@Module({
  controllers: [MainMenuController],
})
export class AppModule {}

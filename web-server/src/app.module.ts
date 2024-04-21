import { Module } from '@nestjs/common';
import { MainMenuModule } from './module.main-menu/mainMenu.module';
import { SystemComponentsModule } from './module.components/components.module';

@Module({
  imports: [MainMenuModule, SystemComponentsModule],
})
export class AppModule {}

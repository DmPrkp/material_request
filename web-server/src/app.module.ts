import { Module } from '@nestjs/common';
import { MainMenuModule } from './module.main-menu/mainMenu.module';
import { SystemComponentsModule } from './module.components/components.module';
import { PGClientFactory } from './db/db.factory';

@Module({
  imports: [MainMenuModule, SystemComponentsModule],
  providers: [PGClientFactory],
})
export class AppModule {}

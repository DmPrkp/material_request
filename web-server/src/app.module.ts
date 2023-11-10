import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MainMenuController } from './controller/main-menu/main-menu.controller';
import { SystemComponentsController } from './controller/system-components/system-components.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'ionic-client'),
      exclude: ['/api/(.*)'],
    }),
  ],
  controllers: [MainMenuController, SystemComponentsController],
})
export class AppModule {}

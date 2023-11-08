import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MainMenuController } from './main-menu/main-menu.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'ionic-client'),
      exclude: ['/api/(.*)'],
    }),
  ],
  controllers: [MainMenuController],
})
export class AppModule {}

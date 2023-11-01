import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MainMenuController } from './main-menu/main-menu.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      // rootPath: join(__dirname, '..', 'web-client'),
      rootPath: join(__dirname, '..', 'ionic-client'),
    }),
  ],
  controllers: [MainMenuController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MainMenuController } from './main-menu/main-menu.controller';

@Module({
  imports: [
    UsersModule,
    ServeStaticModule.forRoot({
      // rootPath: join(__dirname, '..', 'web-client'),
      rootPath: join(__dirname, '..', 'ionic-client'),
    }),
  ],
  controllers: [AppController, MainMenuController],
  providers: [AppService],
})
export class AppModule {}

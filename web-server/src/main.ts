import { NestFactory } from '@nestjs/core';
import { AppModule } from './MainMenuModule';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  // app.enableCors();
  await app.listen(4000);
}
bootstrap();

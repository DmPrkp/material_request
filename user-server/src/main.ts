import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('user/api/v1');

  const port = process.env.PORT ? Number(process.env.PORT) : 4200;
  await app.listen(port);
  console.log(`User server is running on port ${port}`);
}

void bootstrap();

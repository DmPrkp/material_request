import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

const PREFIX = 'admin/api/v1';
const PORT = Number(process.env.PORT ?? 4600);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(PREFIX);
  app.enableShutdownHooks();

  await app.listen(PORT, '0.0.0.0');
  new Logger('bootstrap').log(`Админка поднята на :${PORT}`);
}

void bootstrap();

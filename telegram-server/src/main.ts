import { Logger } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { logError } from './common/error-log';
import { ServerErrorFilter } from './common/server-error.filter';

const PREFIX = 'telegram/api/v1';
const PORT = Number(process.env.PORT ?? 4900);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(PREFIX);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ServerErrorFilter(app.get(HttpAdapterHost).httpAdapter));

  await app.listen(PORT, '0.0.0.0');
  new Logger('bootstrap').log(`Telegram поднят на :${PORT}`);
}

process.on('unhandledRejection', (reason) => logError('unhandledRejection', reason));
process.on('uncaughtException', (error) => {
  logError('uncaughtException', error);
  process.exit(1);
});

void bootstrap().catch((error) => {
  logError('bootstrap', error);
  process.exit(1);
});

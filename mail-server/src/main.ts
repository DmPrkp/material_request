import { Logger } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { logError } from './common/error-log';
import { ServerErrorFilter } from './common/server-error.filter';

const PREFIX = 'mail/api/v1';
const PORT = Number(process.env.PORT ?? 4700);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(PREFIX);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ServerErrorFilter(app.get(HttpAdapterHost).httpAdapter));

  await app.listen(PORT, '0.0.0.0');
  new Logger('bootstrap').log(`Почта поднята на :${PORT}`);
}

/**
 * Мимо глобального фильтра проходит всё, что случилось вне запроса: не поднялся сам сервис,
 * отвалилось фоновое соединение с релеем. Иначе это осталось бы только в stderr контейнера.
 */
process.on('unhandledRejection', (reason) => logError('unhandledRejection', reason));
process.on('uncaughtException', (error) => {
  logError('uncaughtException', error);
  // Состояние процесса после такого неизвестно — выходим, restart: unless-stopped поднимет.
  process.exit(1);
});

void bootstrap().catch((error) => {
  logError('bootstrap', error);
  process.exit(1);
});

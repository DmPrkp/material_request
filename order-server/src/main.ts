import { Logger } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { logError } from './common/error-log';
import { PgConstraintFilter } from './common/pg-errors.filter';

const PREFIX = 'order/api/v1';
const PORT = Number(process.env.PORT ?? 4100);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(PREFIX);
  app.enableShutdownHooks();
  // Валидацию целиком делает Zod (zayavka.dto.ts) — как в остальных сервисах.
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new PgConstraintFilter(app.get(HttpAdapterHost).httpAdapter));

  await app.listen(PORT, '0.0.0.0');
  new Logger('bootstrap').log(`Заявки подняты на :${PORT}`);
}

/**
 * Мимо глобального фильтра проходит всё, что случилось вне запроса: не поднялся сам сервис,
 * отвалился таймер чистки, отказала база на фоновой задаче. Раньше это оставалось только
 * в stderr контейнера — теперь попадает в файл, где мы ошибки и ищем.
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

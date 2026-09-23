import { Logger } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { PgConstraintFilter } from './common/pg-errors.filter';

const PREFIX = 'order/api/v1';
const PORT = Number(process.env.PORT ?? 4100);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(PREFIX);
  app.enableShutdownHooks();
  // Валидацию целиком делает Zod (zaiavka.dto.ts) — как в остальных сервисах.
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new PgConstraintFilter(app.get(HttpAdapterHost).httpAdapter));

  await app.listen(PORT, '0.0.0.0');
  new Logger('bootstrap').log(`Заявки подняты на :${PORT}`);
}

void bootstrap();

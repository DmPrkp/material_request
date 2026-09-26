import { Logger } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { LocalizeInterceptor } from './common/localize.interceptor';
import { logError } from './common/error-log';
import { PgConstraintFilter } from './common/pg-errors.filter';

const PREFIX = 'dict/api/v1';
const PORT = Number(process.env.PORT ?? 4300);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(PREFIX);
  app.enableShutdownHooks();
  // Валидацию целиком делает Zod — ValidationPipe с class-validator тут не нужен.
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new PgConstraintFilter(app.get(HttpAdapterHost).httpAdapter));
  // nameRu/nameEn -> одно name на языке запроса (Accept-Language, по умолчанию ru).
  app.useGlobalInterceptors(new LocalizeInterceptor());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Справочник материалов и инструментов')
      .setDescription(
        'Позиции, их типоразмеры и параметры. Нормы расхода живут в calc-server — ' +
          'здесь их нет, и ссылки оттуда при удалении не проверяются.',
      )
      .setVersion('1.0.0')
      .addServer(`/${PREFIX}`)
      // Токен выдаёт user-server: POST /user/api/v1/auth/login -> accessToken.
      .addBearerAuth()
      .addGlobalParameters(
        {
          in: 'header',
          name: 'Accept-Language',
          required: false,
          description: 'Язык name/description в ответе. Нет перевода или язык неизвестен — ru.',
          schema: { type: 'string', enum: ['ru', 'en'], default: 'ru' },
        },
        {
          in: 'query',
          name: 'translations',
          required: false,
          description: 'all — отдать поля на всех языках (nameRu/nameEn…) без сворачивания: для форм правки.',
          schema: { type: 'string', enum: ['all'] },
        },
      )
      .build(),
  );

  app.use(`/${PREFIX}/openapi.json`, (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json(document);
  });

  app.use(
    `/${PREFIX}/docs`,
    apiReference({
      content: document,
      theme: 'purple',
    }),
  );

  await app.listen(PORT, '0.0.0.0');

  const logger = new Logger('bootstrap');
  logger.log(`Справочник поднят на :${PORT}`);
  logger.log(`Документация: /${PREFIX}/docs`);
}

/**
 * Мимо глобального фильтра проходит всё, что случилось вне запроса: не поднялся сам сервис,
 * отвалилась фоновая задача, отказала база не на запросе. Раньше это оставалось только
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

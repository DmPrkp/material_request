import { Module } from '@nestjs/common';
import { createTransport } from 'nodemailer';

import { MAIL_CONFIG, type MailConfig, mailConfigFromEnv } from './config';
import { MailController } from './mail.controller';
import { MAIL_TRANSPORT, MailService } from './mail.service';

@Module({
  controllers: [MailController],
  providers: [
    MailService,
    { provide: MAIL_CONFIG, useFactory: () => mailConfigFromEnv() },
    {
      provide: MAIL_TRANSPORT,
      inject: [MAIL_CONFIG],
      useFactory: (config: MailConfig) =>
        createTransport({
          host: config.host,
          port: config.port,
          // 465 — шифрование с первого байта, 587 — обычное соединение с переходом на TLS.
          secure: config.port === 465,
          // Шифрование требуем только там, где есть чем авторизоваться: в dev письма идут
          // в mailhog по соседнему контейнеру, TLS у него нет и не нужен.
          requireTLS: Boolean(config.user),
          auth: config.user ? { user: config.user, pass: config.password } : undefined,
        }),
    },
  ],
})
export class MailModule {}

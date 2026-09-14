import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { JwtAuthGuard } from './auth.guard';

/**
 * Глобальный, потому что JwtAuthGuard вешается через @UseGuards в контроллерах
 * других модулей, и Nest собирает его в их контексте — JwtService должен быть виден оттуда.
 *
 * Секрет в JwtModule не передаётся: гвард подставляет его сам при проверке,
 * а подписывать токены словарю нечего — их выдаёт только user-server.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {
  constructor(config: ConfigService) {
    if (!config.get<string>('JWT_SECRET')) {
      new Logger('AuthModule').warn(
        'JWT_SECRET не задан: запись в защищённые справочники будет отвечать 503. ' +
          'Нужен тот же секрет, что у user-server (secrets/jwt/.jwt.env)',
      );
    }
  }
}

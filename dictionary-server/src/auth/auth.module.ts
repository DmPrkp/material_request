import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthGuard, IdentifyGuard } from './auth.guard';

/**
 * Глобальный, потому что AuthGuard вешается через @UseGuards в контроллерах других модулей.
 * Токен здесь не проверяется вовсе — это делает nginx, см. auth-user.ts.
 */
@Global()
@Module({
  // IdentifyGuard — на всё приложение: кто спрашивает, важно и на чтении (что ему видно).
  providers: [AuthGuard, { provide: APP_GUARD, useClass: IdentifyGuard }],
  exports: [AuthGuard],
})
export class AuthModule {}

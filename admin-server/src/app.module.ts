import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AdminGuard } from './auth/auth.guard';
import { AuthController } from './auth/auth.controller';
import { UserServerClient } from './auth/user-server.client';
import { DbPools } from './db/pools';
import { ProxyController } from './proxy/proxy.controller';
import { TablesController } from './tables/tables.controller';
import { TablesService } from './tables/tables.service';

@Module({
  controllers: [AuthController, TablesController, ProxyController],
  providers: [DbPools, UserServerClient, TablesService, { provide: APP_GUARD, useClass: AdminGuard }],
})
export class AppModule {}

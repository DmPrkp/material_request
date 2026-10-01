import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AdminGuard } from './auth/auth.guard';
import { AuthController } from './auth/auth.controller';
import { UserServerClient } from './auth/user-server.client';
import { DbPools } from './db/pools';
import { ImagesController } from './images/images.controller';
import { ImagesService } from './images/images.service';
import { LogsController } from './logs/logs.controller';
import { LogsService } from './logs/logs.service';
import { ProxyController } from './proxy/proxy.controller';
import { TablesController } from './tables/tables.controller';
import { TablesService } from './tables/tables.service';
import { VisitsService } from './visits/visits.service';

@Module({
  controllers: [AuthController, TablesController, ProxyController, LogsController, ImagesController],
  providers: [
    DbPools,
    UserServerClient,
    TablesService,
    LogsService,
    ImagesService,
    VisitsService,
    { provide: APP_GUARD, useClass: AdminGuard },
  ],
})
export class AppModule {}

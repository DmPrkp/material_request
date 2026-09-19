import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule, AuthModule, WarehousesModule],
})
export class AppModule {}

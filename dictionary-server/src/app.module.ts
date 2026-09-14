import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ParamsModule } from './modules/params/params.module';
import { StructureModule } from './modules/structure/structure.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    ParamsModule,
    StructureModule,
    CatalogModule,
  ],
})
export class AppModule {}

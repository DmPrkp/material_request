import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { CompaniesModule } from './modules/companies/companies.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule, AuthModule, CompaniesModule],
})
export class AppModule {}

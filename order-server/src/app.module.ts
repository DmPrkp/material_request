import { Module } from '@nestjs/common';

import { AuthGuard, IdentifyGuard } from './auth/auth.guard';
import { DbModule } from './db/db.module';
import { ZaiavkaController } from './zaiavka/zaiavka.controller';
import { ZaiavkaService } from './zaiavka/zaiavka.service';
import { ZaiavkaSheetGeneratorModule } from './zaiavka_sheet_generator/zaiavka_sheet_generator.module';

@Module({
  imports: [DbModule, ZaiavkaSheetGeneratorModule],
  controllers: [ZaiavkaController],
  providers: [ZaiavkaService, AuthGuard, IdentifyGuard],
})
export class AppModule {}

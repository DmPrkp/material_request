import { Module } from '@nestjs/common';

import { AuthGuard, IdentifyGuard } from './auth/auth.guard';
import { DbModule } from './db/db.module';
import { ZayavkaController } from './zayavka/zayavka.controller';
import { ZayavkaService } from './zayavka/zayavka.service';
import { ZayavkaSheetGeneratorModule } from './zayavka_sheet_generator/zayavka_sheet_generator.module';

@Module({
  imports: [DbModule, ZayavkaSheetGeneratorModule],
  controllers: [ZayavkaController],
  providers: [ZayavkaService, AuthGuard, IdentifyGuard],
})
export class AppModule {}

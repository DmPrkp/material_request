import { Module } from '@nestjs/common';
import { ZaiavkaController } from './zaiavka/zaiavka.controller';
import { ZaiavkaService } from './zaiavka/zaiavka.service';
import { PrismaService } from '../prisma/prisma.service';
import { IdentifyGuard, AuthGuard } from './auth/auth.guard';
import { ZaiavkaSheetGeneratorModule } from './zaiavka_sheet_generator/zaiavka_sheet_generator.module';

@Module({
  imports: [ZaiavkaSheetGeneratorModule],
  controllers: [ZaiavkaController],
  providers: [ZaiavkaService, PrismaService, AuthGuard, IdentifyGuard],
})
export class AppModule {}

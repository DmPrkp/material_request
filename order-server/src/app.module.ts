import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ZaiavkaController } from './zaiavka/zaiavka.controller';
import { ZaiavkaService } from './zaiavka/zaiavka.service';
import { PrismaService } from '../prisma/prisma.service';
import { IdentifyGuard, JwtAuthGuard } from './auth/auth.guard';
import { ZaiavkaSheetGeneratorModule } from './zaiavka_sheet_generator/zaiavka_sheet_generator.module';

@Module({
  // Секрет не регистрируем: гвард берёт JWT_SECRET на каждой проверке.
  imports: [JwtModule.register({}), ZaiavkaSheetGeneratorModule],
  controllers: [ZaiavkaController],
  providers: [ZaiavkaService, PrismaService, JwtAuthGuard, IdentifyGuard],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ZayavkaController } from './zayavka/zayavka.controller';
import { ZayavkaService } from './zayavka/zayavka.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZayavkaSheetGeneratorModule } from './zayavka_sheet_generator/zayavka_sheet_generator.module';

@Module({
  imports: [ZayavkaSheetGeneratorModule],
  controllers: [ZayavkaController],
  providers: [ZayavkaService, PrismaService],
})
export class AppModule {}

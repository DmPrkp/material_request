import { Module } from '@nestjs/common';
import { XlsxGeneratorController } from './xlsx_generator/xlsx_generator.controller';

@Module({
  controllers: [XlsxGeneratorController],
})
export class ZayavkaSheetGeneratorModule {}

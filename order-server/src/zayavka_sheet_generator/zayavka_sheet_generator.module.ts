import { Module } from '@nestjs/common';
import { XlsxGeneratorController } from './ods_generator/ods_generator.controller';

@Module({
  controllers: [XlsxGeneratorController],
})
export class ZayavkaSheetGeneratorModule {}

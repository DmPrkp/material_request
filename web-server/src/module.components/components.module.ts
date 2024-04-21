import { Module } from '@nestjs/common';
import { SystemComponentsController } from './controller/system-components.controller';

@Module({
  controllers: [SystemComponentsController],
})
export class SystemComponentsModule {}

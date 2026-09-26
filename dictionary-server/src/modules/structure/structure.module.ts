import { Module } from '@nestjs/common';

import {
  SitemapController,
  SystemsController,
  WorkStagesController,
  WorkTypesController,
} from './structure.controller';
import { SystemsService, WorkStagesService, WorkTypesService } from './structure.service';

@Module({
  controllers: [WorkTypesController, SystemsController, WorkStagesController, SitemapController],
  providers: [WorkTypesService, SystemsService, WorkStagesService],
  exports: [WorkTypesService, SystemsService, WorkStagesService],
})
export class StructureModule {}

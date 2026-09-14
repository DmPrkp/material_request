import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { createDictionaryController } from '~/common/dictionary.controller';
import {
  CreateSystemDto,
  CreateWorkStageDto,
  CreateWorkTypeDto,
  SystemQueryDto,
  UpdateSystemDto,
  UpdateWorkStageDto,
  UpdateWorkTypeDto,
  WorkStageQueryDto,
  createSystemSchema,
  createWorkStageSchema,
  createWorkTypeSchema,
  updateSystemSchema,
  updateWorkStageSchema,
  updateWorkTypeSchema,
} from './structure.dto';
import { SystemsService, WorkStagesService, WorkTypesService } from './structure.service';

@ApiTags('work-types')
@Controller('work-types')
export class WorkTypesController extends createDictionaryController({
  summary: 'Виды работ: фасад, кровля, внутренняя отделка — уровень над технологиями',
  createSchema: createWorkTypeSchema,
  updateSchema: updateWorkTypeSchema,
  createDto: CreateWorkTypeDto,
  updateDto: UpdateWorkTypeDto,
  authored: true,
}) {
  constructor(protected readonly service: WorkTypesService) {
    super();
  }
}

@ApiTags('systems')
@Controller('systems')
export class SystemsController extends createDictionaryController({
  // В интерфейсе это «технологии работ»; в API и базе осталось systems — на него ссылается calc-server.
  summary: 'Технологии работ: EIFS, frame_scaffold',
  createSchema: createSystemSchema,
  updateSchema: updateSystemSchema,
  createDto: CreateSystemDto,
  updateDto: UpdateSystemDto,
  authored: true,
}) {
  constructor(protected readonly service: SystemsService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: 'Технологии работ, с фильтром по виду работ' })
  @ApiQuery({ name: 'workTypeId', required: false, type: Number })
  override list(@Query() query: SystemQueryDto) {
    return this.service.listByWorkType(query);
  }

  @Get(':id/work-stages')
  @ApiOperation({ summary: 'Этапы работ технологии, по порядку' })
  stagesById(@Param('id', ParseIntPipe) id: number) {
    return this.service.byId(id).then(({ title }) => this.service.stagesBySystemTitle(title));
  }
}

@ApiTags('work-stages')
@Controller('work-stages')
export class WorkStagesController extends createDictionaryController({
  summary: 'Этапы работ (бывш. components). position — порядок слоя в технологии',
  createSchema: createWorkStageSchema,
  updateSchema: updateWorkStageSchema,
  createDto: CreateWorkStageDto,
  updateDto: UpdateWorkStageDto,
  authored: true,
}) {
  constructor(protected readonly service: WorkStagesService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: 'Этапы работ, с фильтром по технологии (systemId)' })
  @ApiParam({ name: 'systemId', required: false })
  override list(@Query() query: WorkStageQueryDto) {
    return this.service.listBySystem(query);
  }
}

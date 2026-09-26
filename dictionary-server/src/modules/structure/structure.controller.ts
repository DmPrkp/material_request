import { Controller, Get, Header, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '~/auth/current-user.decorator';
import type { AuthUser } from '~/auth/auth-user';
import { createDictionaryController } from '~/common/dictionary.controller';
import { IdLookupQueryDto } from '~/common/lookup';
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
import { SITE_URL, renderTechnologiesSitemap } from './sitemap';
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
  override list(@Query() query: SystemQueryDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.listByWorkType(query, user);
  }

  // Два сегмента — с фабричным GET /:id (ParseIntPipe) не спорит.
  @Get('by-title/:title')
  @ApiOperation({
    summary: 'Технология по техническому коду (title) вместе с единицей объёма',
    description: 'Для калькулятора: в его адресе title (/main/facade/EIFS), а не id.',
  })
  byTitle(@Param('title') title: string, @CurrentUser() user: AuthUser | undefined) {
    return this.service.byTitle(title, user);
  }

  @Get(':id/work-stages')
  @ApiOperation({ summary: 'Этапы работ технологии, по порядку' })
  stagesById(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser | undefined) {
    // Чужая личная технология — 404 ещё на byId: её этапы тоже не видны.
    return this.service.byId(id, user).then(({ title }) => this.service.stagesBySystemTitle(title));
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
  override list(@Query() query: WorkStageQueryDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.listBySystem(query, user);
  }

  // Методы наследника Nest регистрирует раньше фабричных — 'lookup' не уходит в GET /:id.
  @Get('lookup')
  @ApiOperation({
    summary: 'Этапы по списку id',
    description:
      'Для расчёта в calc-server: нормы расхода ссылаются на этап его id. Как ' +
      'GET /{material,hand-tool}-variants и /power-tools/lookup: видимость технологии не ' +
      'проверяется, архивные отдаются тоже, чего нет — просто нет в ответе. Не больше 200 id.',
  })
  @ApiQuery({ name: 'ids', required: true, example: '1,2,3' })
  lookup(@Query() query: IdLookupQueryDto) {
    return this.service.lookup(query.ids);
  }
}

@ApiTags('sitemap')
@Controller('sitemap')
export class SitemapController {
  constructor(private readonly systems: SystemsService) {}

  // Наружу — /sitemap-technologies.xml: его проксирует главный nginx.
  @Get('technologies.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @ApiOperation({
    summary: 'Sitemap страниц калькулятора: виды работ и технологии',
    description: 'Общие и не архивные, на всех языках с hreflang. Часть индекса /sitemap.xml.',
  })
  async technologies() {
    return renderTechnologiesSitemap(SITE_URL, await this.systems.publicForSitemap());
  }
}

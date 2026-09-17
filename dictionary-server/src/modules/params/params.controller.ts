import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { createDictionaryController } from '~/common/dictionary.controller';
import {
  CreateParamKindDto,
  CreateParamValueDto,
  CreateUnitDto,
  ParamValueQueryDto,
  UpdateParamKindDto,
  UpdateParamValueDto,
  UpdateUnitDto,
  createParamKindSchema,
  createParamValueSchema,
  createUnitSchema,
  updateParamKindSchema,
  updateParamValueSchema,
  updateUnitSchema,
} from './params.dto';
import { ParamKindsService, ParamValuesService, UnitsService } from './params.service';

@ApiTags('units')
@Controller('units')
export class UnitsController extends createDictionaryController({
  summary: 'Единицы измерения',
  createSchema: createUnitSchema,
  updateSchema: updateUnitSchema,
  createDto: CreateUnitDto,
  updateDto: UpdateUnitDto,
}) {
  constructor(protected readonly service: UnitsService) {
    super();
  }
}

@ApiTags('param-kinds')
@Controller('param-kinds')
export class ParamKindsController extends createDictionaryController({
  summary: 'Виды параметров: длина, диаметр, напряжение',
  createSchema: createParamKindSchema,
  updateSchema: updateParamKindSchema,
  createDto: CreateParamKindDto,
  updateDto: UpdateParamKindDto,
}) {
  constructor(protected readonly service: ParamKindsService) {
    super();
  }
}

/**
 * У значений параметров свой список: голое «5.5» без единицы бесполезно,
 * поэтому отдаём вместе с единицей и разрешаем фильтр по ней.
 *
 * Значение неизменяемо (immutable): его id входит в код сборки
 * (modules/catalog/variant-code.ts), а код — это ссылка из норм расхода. Правка
 * «8 мм» на «10 мм» на месте оставила бы и id, и все коды прежними, молча подменив
 * смысл каждой сборки с этим значением. Нужно другое число — заводится другое
 * значение; уникальность (вид, число, единица) не даст завести его дважды, а
 * удалить используемое не даст CrudService.remove.
 * Остальные операции — стандартные, из фабрики.
 */
@ApiTags('param-values')
@Controller('param-values')
export class ParamValuesController extends createDictionaryController({
  summary: 'Значения параметров вместе с единицей измерения',
  createSchema: createParamValueSchema,
  updateSchema: updateParamValueSchema,
  createDto: CreateParamValueDto,
  updateDto: UpdateParamValueDto,
  immutable: true,
}) {
  constructor(protected readonly service: ParamValuesService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: 'Значения параметров вместе с единицей измерения' })
  override list(@Query() query: ParamValueQueryDto) {
    return this.service.listWithUnit(query);
  }
}

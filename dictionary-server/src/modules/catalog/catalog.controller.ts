import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '~/auth/auth.guard';
import { CurrentUser } from '~/auth/current-user.decorator';
import type { AuthUser } from '~/auth/auth-user';
import { ListQueryDto } from '~/common/list-query.dto';
import { IdLookupQueryDto } from '~/common/lookup';
import { createDictionaryController } from '~/common/dictionary.controller';
import {
  CreateHandToolDto,
  CreateMaterialDto,
  CreateMaterialTypeDto,
  CreatePowerToolDto,
  CreateVariantDto,
  MaterialQueryDto,
  PowerToolQueryDto,
  ReplaceVariantParamsDto,
  UpdateHandToolDto,
  UpdateMaterialDto,
  UpdateMaterialTypeDto,
  UpdatePowerToolDto,
  createHandToolSchema,
  createMaterialSchema,
  createMaterialTypeSchema,
  createPowerToolSchema,
  updateHandToolSchema,
  updateMaterialSchema,
  updateMaterialTypeSchema,
  updatePowerToolSchema,
} from './catalog.dto';
import {
  HandToolsService,
  MaterialTypesService,
  MaterialsService,
  PowerToolsService,
} from './catalog.service';
import { VariantsService } from './variants.service';

/** Правка сборки чужой общей позиции — в копии пользователя (VariantsService). */
const VARIANT_FORK_NOTE =
  'У чужой общей позиции сборка меняется в копии пользователя: в ответе ownerId копии.';

@ApiTags('hand-tools')
@Controller('hand-tools')
export class HandToolsController extends createDictionaryController({
  summary: 'Ручной инструмент',
  createSchema: createHandToolSchema,
  updateSchema: updateHandToolSchema,
  createDto: CreateHandToolDto,
  updateDto: UpdateHandToolDto,
  authored: true,
}) {
  constructor(
    protected readonly service: HandToolsService,
    private readonly variants: VariantsService,
  ) {
    super();
  }

  @Get()
  @ApiOperation({
    summary: 'Ручной инструмент вместе с числом типоразмеров',
    description: 'variantsCount — сколько типоразмеров с параметрами; служебный вариант без параметров не в счёт.',
  })
  override list(@Query() query: ListQueryDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.listWithVariantCount(query, user);
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Типоразмеры инструмента с их параметрами' })
  listVariants(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser | undefined) {
    return this.variants.listByOwner('hand-tool', id, user);
  }

  // Типоразмеры — часть инструмента, запись закрыта так же, как у него самого (authored).
  // user! — за AuthGuard он есть всегда.

  @Post(':id/variants')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Добавить типоразмер. code собирается автоматически',
    description:
      'params — тройки «вид, единица, число»: значения, которых ещё нет, заводятся сами. ' + VARIANT_FORK_NOTE,
  })
  createVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.variants.createFor('hand-tool', id, dto, user!);
  }

  @Put(':id/variants/:variantId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Заменить параметры типоразмера',
    description:
      'Набор заменяется целиком, code пересчитывается. id варианта прежний — на него ссылаются нормы расхода. ' +
      VARIANT_FORK_NOTE,
  })
  replaceVariantParams(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: ReplaceVariantParamsDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.variants.replaceParams('hand-tool', id, variantId, dto.params, user!);
  }
}

@ApiTags('power-tools')
@Controller('power-tools')
export class PowerToolsController extends createDictionaryController({
  summary: 'Электроинструмент',
  createSchema: createPowerToolSchema,
  updateSchema: updatePowerToolSchema,
  createDto: CreatePowerToolDto,
  updateDto: UpdatePowerToolDto,
  // Как у остальных разделов каталога: запись со входом, у каждого пользователя своё.
  authored: true,
}) {
  constructor(protected readonly service: PowerToolsService) {
    super();
  }

  @Get()
  @ApiOperation({
    summary: 'Электроинструмент',
    description: '?corded=true — сетевой, ?corded=false — аккумуляторный; без фильтра — весь.',
  })
  override list(@Query() query: PowerToolQueryDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.listByCurrent(query, user);
  }

  // Методы наследника Nest регистрирует раньше фабричных, так что 'lookup' не уходит
  // в GET /:id с ParseIntPipe (там был бы 400).
  @Get('lookup')
  @ApiOperation({
    summary: 'Электроинструмент по списку id',
    description:
      'Для норм расхода calc-server — они ссылаются на электроинструмент id позиции. ' +
      'Как GET /{material,hand-tool}-variants: архивные отдаются тоже, чужое личное не ' +
      'скрывается, чего нет — просто нет в ответе. Не больше 200 id за раз.',
  })
  @ApiQuery({ name: 'ids', required: true, example: '15,26' })
  lookup(@Query() query: IdLookupQueryDto) {
    return this.service.lookup(query.ids);
  }
}

@ApiTags('material-types')
@Controller('material-types')
export class MaterialTypesController extends createDictionaryController({
  summary: 'Типы материалов: пиломатериалы, крепёж, сухие смеси, леса',
  createSchema: createMaterialTypeSchema,
  updateSchema: updateMaterialTypeSchema,
  createDto: CreateMaterialTypeDto,
  updateDto: UpdateMaterialTypeDto,
}) {
  constructor(protected readonly service: MaterialTypesService) {
    super();
  }
}

@ApiTags('materials')
@Controller('materials')
export class MaterialsController extends createDictionaryController({
  summary: 'Материалы',
  createSchema: createMaterialSchema,
  updateSchema: updateMaterialSchema,
  createDto: CreateMaterialDto,
  updateDto: UpdateMaterialDto,
  authored: true,
}) {
  constructor(
    protected readonly service: MaterialsService,
    private readonly variants: VariantsService,
  ) {
    super();
  }

  @Get()
  @ApiOperation({
    summary: 'Материалы вместе с единицей измерения, типом и числом типоразмеров',
    description:
      'Фильтры: ?typeId= — материалы одного типа, ?untyped=true — те, у кого тип ещё не проставлен. ' +
      'variantsCount — сколько типоразмеров с параметрами; служебный вариант без параметров не в счёт.',
  })
  override list(@Query() query: MaterialQueryDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.listWithUnit(query, user);
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Типоразмеры материала с их параметрами' })
  listVariants(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser | undefined) {
    return this.variants.listByOwner('material', id, user);
  }

  // Сборки — часть материала, запись закрыта так же, как у него самого (authored).

  @Post(':id/variants')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Добавить типоразмер. code собирается автоматически',
    description:
      'params — тройки «вид, единица, число»: значения, которых ещё нет, заводятся сами. ' + VARIANT_FORK_NOTE,
  })
  createVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.variants.createFor('material', id, dto, user!);
  }

  @Put(':id/variants/:variantId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Заменить параметры типоразмера',
    description:
      'Набор заменяется целиком, code пересчитывается. id варианта прежний — на него ссылаются нормы расхода. ' +
      VARIANT_FORK_NOTE,
  })
  replaceVariantParams(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: ReplaceVariantParamsDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.variants.replaceParams('material', id, variantId, dto.params, user!);
  }
}

import { Controller, Delete, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '~/auth/auth.guard';
import { CurrentUser } from '~/auth/current-user.decorator';
import type { AuthUser } from '~/auth/jwt-payload';
import { hardDeleteQuery } from '~/common/delete-query';
import { VariantLookupQueryDto } from './catalog.dto';
import { VariantsService } from './variants.service';

const DELETE_DOC = {
  summary: 'Удалить типоразмер',
  description:
    'По умолчанию архивирует. ?hard=true удаляет физически вместе со связками параметров — ' +
    'но нормы расхода в calc-server живут в другой базе, и ссылки оттуда здесь не проверяются. ' +
    'Для типоразмеров, участвующих в расчёте, пользуйтесь мягким удалением. ' +
    'Права — как у самой позиции: своей — автору, любой — админу.',
};

const LOOKUP_DOC = {
  summary: 'Сборки по списку id или кодов — с названием позиции',
  description:
    'Ровно один из параметров: ?ids=1,2 или ?codes=8:208:243,6. Нормы расхода в ' +
    'calc-server ссылаются кодом сборки, поэтому им нужен второй: правка параметров ' +
    'пересчитывает код, и норма от прежнего типоразмера сюда не доедет. Архивные ' +
    'отдаются тоже. Чужое личное здесь не скрывается: спрашивают точные ссылки, ' +
    'а не список, и ответ одинаков для всех — расчёт не зависит от того, кто считает.',
};

const FORBIDDEN_DOC = { description: 'Позиция чужая, а спрашивает не админ' };

@ApiTags('hand-tool-variants')
@Controller('hand-tool-variants')
export class HandToolVariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get()
  @ApiOperation(LOOKUP_DOC)
  @ApiQuery({ name: 'ids', required: false, example: '80,89' })
  @ApiQuery({ name: 'codes', required: false, example: '8:208:243,6' })
  lookup(@Query() query: VariantLookupQueryDto) {
    return query.codes ? this.variants.byCodes('hand-tool', query.codes) : this.variants.byIds('hand-tool', query.ids!);
  }

  // Ручной инструмент пишется только со входом (authored) — его типоразмеры тоже.
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation(DELETE_DOC)
  @ApiForbiddenResponse(FORBIDDEN_DOC)
  @ApiQuery({ name: 'hard', required: false, type: Boolean })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: { hard?: string },
    @CurrentUser() user: AuthUser | undefined,
  ) {
    if (hardDeleteQuery(query)) {
      await this.variants.remove('hand-tool', id, user);
      return { deleted: true, mode: 'hard' as const };
    }
    await this.variants.archive('hand-tool', id, user);
    return { deleted: true, mode: 'soft' as const };
  }
}

@ApiTags('material-variants')
@Controller('material-variants')
export class MaterialVariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get()
  @ApiOperation(LOOKUP_DOC)
  @ApiQuery({ name: 'ids', required: false, example: '80,89' })
  @ApiQuery({ name: 'codes', required: false, example: '8:208:243,6' })
  lookup(@Query() query: VariantLookupQueryDto) {
    return query.codes ? this.variants.byCodes('material', query.codes) : this.variants.byIds('material', query.ids!);
  }

  // Материалы пишутся только со входом (authored) — их сборки тоже.
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation(DELETE_DOC)
  @ApiForbiddenResponse(FORBIDDEN_DOC)
  @ApiQuery({ name: 'hard', required: false, type: Boolean })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: { hard?: string },
    @CurrentUser() user: AuthUser | undefined,
  ) {
    if (hardDeleteQuery(query)) {
      await this.variants.remove('material', id, user);
      return { deleted: true, mode: 'hard' as const };
    }
    await this.variants.archive('material', id, user);
    return { deleted: true, mode: 'soft' as const };
  }
}

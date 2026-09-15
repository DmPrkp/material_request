import { Controller, Delete, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '~/auth/auth.guard';
import { hardDeleteQuery } from '~/common/delete-query';
import { VariantsService } from './variants.service';

const DELETE_DOC = {
  summary: 'Удалить типоразмер',
  description:
    'По умолчанию архивирует. ?hard=true удаляет физически вместе со связками параметров — ' +
    'но нормы расхода в calc-server живут в другой базе, и ссылки оттуда здесь не проверяются. ' +
    'Для типоразмеров, участвующих в расчёте, пользуйтесь мягким удалением.',
};

@ApiTags('hand-tool-variants')
@Controller('hand-tool-variants')
export class HandToolVariantsController {
  constructor(private readonly variants: VariantsService) {}

  // Ручной инструмент пишется только со входом (authored) — его типоразмеры тоже.
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation(DELETE_DOC)
  @ApiQuery({ name: 'hard', required: false, type: Boolean })
  async remove(@Param('id', ParseIntPipe) id: number, @Query() query: { hard?: string }) {
    if (hardDeleteQuery(query)) {
      await this.variants.remove('hand-tool', id);
      return { deleted: true, mode: 'hard' as const };
    }
    await this.variants.archive('hand-tool', id);
    return { deleted: true, mode: 'soft' as const };
  }
}

@ApiTags('material-variants')
@Controller('material-variants')
export class MaterialVariantsController {
  constructor(private readonly variants: VariantsService) {}

  // Материалы пишутся только со входом (authored) — их сборки тоже.
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation(DELETE_DOC)
  @ApiQuery({ name: 'hard', required: false, type: Boolean })
  async remove(@Param('id', ParseIntPipe) id: number, @Query() query: { hard?: string }) {
    if (hardDeleteQuery(query)) {
      await this.variants.remove('material', id);
      return { deleted: true, mode: 'hard' as const };
    }
    await this.variants.archive('material', id);
    return { deleted: true, mode: 'soft' as const };
  }
}

import { Controller, Delete, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '~/auth/auth.guard';
import { CurrentUser } from '~/auth/current-user.decorator';
import type { AuthUser } from '~/auth/jwt-payload';
import { hardDeleteQuery } from '~/common/delete-query';
import { VariantsService } from './variants.service';

const DELETE_DOC = {
  summary: 'Удалить типоразмер',
  description:
    'По умолчанию архивирует. ?hard=true удаляет физически вместе со связками параметров — ' +
    'но нормы расхода в calc-server живут в другой базе, и ссылки оттуда здесь не проверяются. ' +
    'Для типоразмеров, участвующих в расчёте, пользуйтесь мягким удалением. ' +
    'Права — как у самой позиции: своей — автору, любой — админу.',
};

const FORBIDDEN_DOC = { description: 'Позиция чужая, а спрашивает не админ' };

@ApiTags('hand-tool-variants')
@Controller('hand-tool-variants')
export class HandToolVariantsController {
  constructor(private readonly variants: VariantsService) {}

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

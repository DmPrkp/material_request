import {
  applyDecorators,
  Body,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  type Type,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ZodTypeAny } from 'zod';

import { JwtAuthGuard } from '~/auth/auth.guard';
import { CurrentUser } from '~/auth/current-user.decorator';
import type { AuthUser } from '~/auth/jwt-payload';
import type { CrudService } from './crud.service';
import { hardDeleteQuery } from './delete-query';
import { ListQueryDto } from './list-query.dto';
import type { Page } from './pagination';

export type DictionaryControllerOptions = {
  /** Что это за справочник — попадает в описание списка в Scalar. */
  summary: string;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  createDto: Type<unknown>;
  updateDto: Type<unknown>;
  /**
   * Запись (создание, правка, удаление, восстановление) — только с токеном user-server,
   * а создание проставляет created_by = id пользователя. Чтение остаётся открытым.
   * У таблицы обязана быть колонка createdBy (см. authorship в schema.ts).
   */
  authored?: boolean;
};

/**
 * Собирает базовый класс со стандартным набором операций справочника.
 *
 * Ради одинакового поведения удаления во всех ресурсах: DELETE по умолчанию
 * архивирует (is_active = false), ?hard=true удаляет физически и падает с 409,
 * если внутри словаря на позицию есть ссылки.
 *
 * @Controller и @ApiTags намеренно НЕ вешаются здесь, а на наследника: без
 * собственного декоратора класса TypeScript не эмитит design:paramtypes,
 * и Nest не может заинжектить сервис в конструктор наследника.
 */
export function createDictionaryController(options: DictionaryControllerOptions) {
  // Закрываем именно запись, а не контроллер целиком: справочник читают и анонимы
  // (сборники на клиенте открыты без входа).
  const Writes = options.authored
    ? applyDecorators(
        UseGuards(JwtAuthGuard),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ description: 'Нет токена user-server или он недействителен' }),
      )
    : applyDecorators();

  abstract class DictionaryController {
    protected abstract readonly service: CrudService<{ id: number }>;

    @Get()
    @ApiOperation({ summary: options.summary })
    // Page<unknown>: наследники отдают строки с подмешанными связями
    // (материал с единицей, значение параметра с единицей).
    list(@Query() query: ListQueryDto): Promise<Page<unknown>> {
      return this.service.list(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Одна позиция по id' })
    byId(@Param('id', ParseIntPipe) id: number) {
      return this.service.byId(id);
    }

    @Post()
    @Writes
    @ApiOperation({ summary: 'Создать позицию' })
    @ApiBody({ type: options.createDto })
    create(
      @Body(new ZodValidationPipe(options.createSchema)) dto: Record<string, unknown>,
      @CurrentUser() user: AuthUser | undefined,
    ) {
      // user здесь есть всегда: при authored до метода без токена не дойти (JwtAuthGuard).
      return this.service.create(options.authored ? { ...dto, createdBy: user!.id } : dto);
    }

    @Patch(':id')
    @Writes
    @ApiOperation({ summary: 'Изменить позицию' })
    @ApiBody({ type: options.updateDto })
    update(
      @Param('id', ParseIntPipe) id: number,
      @Body(new ZodValidationPipe(options.updateSchema)) dto: Record<string, unknown>,
    ) {
      return this.service.update(id, dto);
    }

    @Delete(':id')
    @Writes
    @ApiOperation({
      summary: 'Удалить позицию',
      description:
        'По умолчанию мягко: is_active = false, позиция пропадает из выдачи, но старые расчёты не ломаются. ' +
        '?hard=true удаляет физически — вернёт 409 со списком ссылок, если позиция используется. ' +
        'Ссылки из норм расхода в calc-server отсюда НЕ видны: это другая база.',
    })
    @ApiQuery({ name: 'hard', required: false, type: Boolean })
    @ApiOkResponse({ description: 'Позиция удалена или архивирована' })
    async remove(@Param('id', ParseIntPipe) id: number, @Query() query: { hard?: string }) {
      if (hardDeleteQuery(query)) {
        await this.service.remove(id);
        return { deleted: true, mode: 'hard' as const };
      }
      return { deleted: true, mode: 'soft' as const, item: await this.service.archive(id) };
    }

    @Post(':id/restore')
    @Writes
    @ApiOperation({ summary: 'Вернуть архивную позицию в строй' })
    restore(@Param('id', ParseIntPipe) id: number) {
      return this.service.restore(id);
    }
  }

  return DictionaryController;
}

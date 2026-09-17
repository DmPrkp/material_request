import {
  applyDecorators,
  Body,
  Delete,
  Get,
  MethodNotAllowedException,
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
  ApiForbiddenResponse,
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
  /**
   * Позиция неизменяема: PATCH отвечает 405. Заводится и удаляется, но не правится —
   * так живут значения параметров, на которые ссылаются коды сборок.
   */
  immutable?: boolean;
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
    // user на чтении — от глобального IdentifyGuard: вошедшему видны и его личные позиции.
    list(@Query() query: ListQueryDto, @CurrentUser() user: AuthUser | undefined): Promise<Page<unknown>> {
      return this.service.list(query, user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Одна позиция по id' })
    byId(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser | undefined) {
      return this.service.byId(id, user);
    }

    @Post()
    @Writes
    @ApiOperation({ summary: 'Создать позицию' })
    @ApiBody({ type: options.createDto })
    create(
      @Body(new ZodValidationPipe(options.createSchema)) dto: Record<string, unknown>,
      @CurrentUser() user: AuthUser | undefined,
    ) {
      // При authored user есть всегда: без токена до метода не дойти (JwtAuthGuard).
      // Без authored автора не пишем, даже если токен прислали: колонки createdBy у таблицы нет.
      return this.service.create(dto, options.authored ? user : undefined);
    }

    @Patch(':id')
    @Writes
    @ApiOperation({
      summary: options.immutable ? 'Правка запрещена (405)' : 'Изменить позицию',
      description: options.immutable
        ? 'Позиция неизменяема: заведите новую и удалите прежнюю. Правка на месте подменила бы ' +
          'смысл записи, оставив её id и все ссылки на него прежними.'
        : 'Своё (у админа — любое) правится на месте. Чужая общая позиция у пользователя не меняется: ' +
          'ему заводится копия с правкой, и в ответе — она, с новым id.',
    })
    @ApiBody({ type: options.updateDto })
    update(
      @Param('id', ParseIntPipe) id: number,
      @Body(new ZodValidationPipe(options.updateSchema)) dto: Record<string, unknown>,
      @CurrentUser() user: AuthUser | undefined,
    ) {
      if (options.immutable) {
        throw new MethodNotAllowedException('Позиция неизменяема: заведите новую и удалите прежнюю');
      }
      return this.service.update(id, dto, user);
    }

    @Delete(':id')
    @Writes
    @ApiOperation({
      summary: 'Удалить позицию',
      description:
        'По умолчанию мягко: is_active = false, позиция пропадает из выдачи, но старые расчёты не ломаются. ' +
        '?hard=true удаляет физически — вернёт 409 со списком ссылок, если позиция используется. ' +
        'Ссылки из норм расхода в calc-server отсюда НЕ видны: это другая база. ' +
        'Удалить можно только своё; админ — любое, остальным на чужое 403.',
    })
    @ApiQuery({ name: 'hard', required: false, type: Boolean })
    @ApiOkResponse({ description: 'Позиция удалена или архивирована' })
    @ApiForbiddenResponse({ description: 'Позиция чужая, а спрашивает не админ' })
    async remove(
      @Param('id', ParseIntPipe) id: number,
      @Query() query: { hard?: string },
      @CurrentUser() user: AuthUser | undefined,
    ) {
      if (hardDeleteQuery(query)) {
        await this.service.remove(id, user);
        return { deleted: true, mode: 'hard' as const };
      }
      return { deleted: true, mode: 'soft' as const, item: await this.service.archive(id, user) };
    }

    @Post(':id/restore')
    @Writes
    @ApiOperation({ summary: 'Вернуть архивную позицию в строй' })
    restore(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser | undefined) {
      return this.service.restore(id, user);
    }
  }

  return DictionaryController;
}

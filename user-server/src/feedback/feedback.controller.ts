import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators';
import { PublicUser } from '../users/public-user';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { FeedbackService } from './feedback.service';

/**
 * Обратная связь. Не @Public намеренно: гостю клиент показывает почту, а не форму —
 * открытая ручка записи в базу без входа набралась бы мусором за ночь.
 *
 * Читает обращения админка, напрямую из базы под read-only ролью (`user.feedback`
 * в `admin-server/src/tables/registry.ts`) — отдельной ручки чтения тут нет.
 */
@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(@CurrentUser() user: PublicUser, @Body() dto: CreateFeedbackDto): Promise<void> {
    const row = await this.feedbackService.create(user.id, dto);
    // В лог приложения, а не в лог ошибок: это не поломка, но знать о новом обращении полезно.
    this.logger.log(`обращение #${row.id} (${dto.topic}) от пользователя ${user.id}`);
  }
}

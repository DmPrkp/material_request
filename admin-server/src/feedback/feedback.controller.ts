import { Controller, Get } from '@nestjs/common';

import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  /** Все обращения, новые сверху. Пишет их ionic-client в user-server, сюда — только чтение. */
  @Get()
  list() {
    return this.feedback.list();
  }
}

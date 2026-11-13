import { Inject, Injectable } from '@nestjs/common';

import { type Database, DB } from '~/db/db.module';
import { type Feedback, feedback } from '~/db/schema';
import type { CreateFeedbackDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Автор — из токена, а не из тела: иначе обращение можно подписать кем угодно. */
  async create(userId: number, dto: CreateFeedbackDto): Promise<Feedback> {
    const [row] = await this.db
      .insert(feedback)
      .values({ userId, topic: dto.topic, message: dto.message })
      .returning();
    return row;
  }
}

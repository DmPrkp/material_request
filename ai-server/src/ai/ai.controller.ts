import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';

import type { AuthUser } from '~/auth/auth-user';
import { AuthGuard } from '~/auth/auth.guard';
import { CurrentUser } from '~/auth/current-user.decorator';

import { ChatDto } from './chat.dto';
import { ChatService } from './chat.service';

@Controller()
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly chatService: ChatService) {}

  /** 200, не 201: ничего не создаётся — это ход диалога. */
  @Post('chat')
  @HttpCode(200)
  chat(@Body() dto: ChatDto, @CurrentUser() user: AuthUser) {
    return this.chatService.chat(user, dto);
  }
}

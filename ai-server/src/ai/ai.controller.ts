import { Body, Controller, HttpCode, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import type { AuthUser } from '~/auth/auth-user';
import { AuthGuard } from '~/auth/auth.guard';
import { CurrentUser } from '~/auth/current-user.decorator';

import { ChatDto } from './chat.dto';
import { ChatService } from './chat.service';
import { MAX_AUDIO_BYTES, TranscribeService, type UploadedAudio } from './transcribe.service';

@Controller()
@UseGuards(AuthGuard)
export class AiController {
  constructor(
    private readonly chatService: ChatService,
    private readonly transcribeService: TranscribeService,
  ) {}

  /** 200, не 201: ничего не создаётся — это ход диалога. */
  @Post('chat')
  @HttpCode(200)
  chat(@Body() dto: ChatDto, @CurrentUser() user: AuthUser) {
    return this.chatService.chat(user, dto);
  }

  /**
   * Голос → текст: поле file (multipart) и необязательный language. Текст возвращаем в поле
   * ввода, а не шлём в чат сразу: распознавание ошибается, и записанное «удали заявку» не должно
   * уходить модели, пока человек не прочёл его глазами.
   */
  @Post('transcribe')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AUDIO_BYTES } }))
  transcribe(@UploadedFile() file: UploadedAudio | undefined, @Body('language') language?: string) {
    return this.transcribeService.transcribe(file, language);
  }
}

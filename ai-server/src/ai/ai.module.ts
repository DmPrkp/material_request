import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { ChatService } from './chat.service';
import { AI_CONFIG, aiConfigFromEnv } from './config';
import { LLM, OpenAiLlm } from './llm';
import { TranscribeService } from './transcribe.service';
import { ServiceClient } from './service-client';

@Module({
  controllers: [AiController],
  providers: [
    ChatService,
    TranscribeService,
    ServiceClient,
    { provide: AI_CONFIG, useFactory: () => aiConfigFromEnv() },
    { provide: LLM, useClass: OpenAiLlm },
  ],
})
export class AiModule {}

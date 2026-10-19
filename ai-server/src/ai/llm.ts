import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';

import type { ChatMessage, ToolCall } from './chat.dto';
import { AI_CONFIG, type AiConfig } from './config';
import { toolDefinitions } from './tools';

export const LLM = Symbol('LLM');

export type AssistantReply = { content: string | null; tool_calls?: ToolCall[] };

/** Шов под тесты: ChatService не знает про SDK. */
export interface Llm {
  complete(system: string, messages: ChatMessage[]): Promise<AssistantReply>;
}

@Injectable()
export class OpenAiLlm implements Llm {
  private client?: OpenAI;

  constructor(@Inject(AI_CONFIG) private readonly config: AiConfig) {}

  async complete(system: string, messages: ChatMessage[]): Promise<AssistantReply> {
    if (!this.config.token) throw new ServiceUnavailableException('Ассистент не настроен: нет AI_TOKEN');
    this.client ??= new OpenAI({ apiKey: this.config.token, baseURL: this.config.baseUrl });

    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [{ role: 'system', content: system }, ...messages] as OpenAI.ChatCompletionMessageParam[],
      tools: toolDefinitions(),
    });

    const message = completion.choices[0]?.message;
    if (!message) throw new Error('Модель вернула пустой ответ');

    const calls = (message.tool_calls ?? []).flatMap((call) =>
      call.type === 'function' ? [{ id: call.id, type: 'function' as const, function: call.function }] : [],
    );
    return { content: message.content, ...(calls.length ? { tool_calls: calls } : {}) };
  }
}

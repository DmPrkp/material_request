import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI, { toFile } from 'openai';

import type { ChatMessage, ToolCall } from './chat.dto';
import { AI_CONFIG, type AiConfig } from './config';
import { toolDefinitions } from './tools';

export const LLM = Symbol('LLM');

export type AssistantReply = { content: string | null; tool_calls?: ToolCall[] };

/** Шов под тесты: ChatService не знает про SDK. */
export type AudioInput = { buffer: Buffer; filename: string; mimetype: string };

export interface Llm {
  /** Речь в текст. language — подсказка модели (ru, en). */
  transcribe(audio: AudioInput, language: string): Promise<string>;

  /** tools: false — обычный ответ без вызова инструментов (классификатор темы). */
  complete(system: string, messages: ChatMessage[], options?: { tools?: boolean }): Promise<AssistantReply>;
}

@Injectable()
export class OpenAiLlm implements Llm {
  private client?: OpenAI;

  constructor(@Inject(AI_CONFIG) private readonly config: AiConfig) {}

  async transcribe(audio: AudioInput, language: string): Promise<string> {
    const client = this.openai();
    const file = await toFile(audio.buffer, audio.filename, { type: audio.mimetype });
    const result = await client.audio.transcriptions.create({
      model: this.config.speechModel,
      file,
      language,
    });
    return result.text;
  }

  private openai(): OpenAI {
    if (!this.config.token) throw new ServiceUnavailableException('Ассистент не настроен: нет AI_TOKEN');
    this.client ??= new OpenAI({ apiKey: this.config.token, baseURL: this.config.baseUrl });
    return this.client;
  }

  async complete(
    system: string,
    messages: ChatMessage[],
    options: { tools?: boolean } = {},
  ): Promise<AssistantReply> {
    const completion = await this.openai().chat.completions.create({
      model: this.config.model,
      messages: [{ role: 'system', content: system }, ...messages] as OpenAI.ChatCompletionMessageParam[],
      ...(options.tools === false ? {} : { tools: toolDefinitions() }),
    });

    const message = completion.choices[0]?.message;
    if (!message) throw new Error('Модель вернула пустой ответ');

    const calls = (message.tool_calls ?? []).flatMap((call) =>
      call.type === 'function' ? [{ id: call.id, type: 'function' as const, function: call.function }] : [],
    );
    return { content: message.content, ...(calls.length ? { tool_calls: calls } : {}) };
  }
}

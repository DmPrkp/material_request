import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const MAX_MESSAGES = 60;
const MAX_CONTENT = 20_000;

export const toolCallSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.literal('function'),
  function: z.object({ name: z.string().max(100), arguments: z.string().max(MAX_CONTENT) }),
});

/**
 * Диалог хранит клиент и присылает целиком: у сервиса нет базы. Роли system нет намеренно —
 * системную инструкцию задаём только мы, иначе клиент переписал бы правила ассистента.
 */
export const messageSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), content: z.string().min(1).max(MAX_CONTENT) }),
  z.object({
    role: z.literal('assistant'),
    content: z.string().max(MAX_CONTENT).nullable(),
    tool_calls: z.array(toolCallSchema).max(10).optional(),
  }),
  z.object({
    role: z.literal('tool'),
    tool_call_id: z.string().min(1).max(100),
    content: z.string().max(100_000),
  }),
]);

export const chatSchema = z.strictObject({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  /** id вызовов, которые пользователь подтвердил; неподтверждённые считаются отклонёнными. */
  approve: z.array(z.string()).max(10).optional(),
});

export type ToolCall = z.infer<typeof toolCallSchema>;
export type ChatMessage = z.infer<typeof messageSchema>;
export class ChatDto extends createZodDto(chatSchema) {}

export type PendingAction = { id: string; name: string; args: unknown; summary: string };

export type ChatResponse = {
  /** Только новые сообщения — клиент дописывает их к своей истории. */
  messages: ChatMessage[];
  status: 'done' | 'confirm';
  /** Что ждёт подтверждения (status = confirm). */
  pending: PendingAction[];
};

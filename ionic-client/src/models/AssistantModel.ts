import BaseModel from "./BaseModel";

/** Формат function calling: диалог хранит клиент и присылает его ассистенту целиком. */
export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

/** Изменение, которое ассистент хочет сделать и которое ждёт решения человека. */
export type PendingAction = {
  id: string;
  name: string;
  args: unknown;
  summary: string;
};

export type ChatResponse = {
  /** Только новые сообщения — их дописывают к истории. */
  messages: ChatMessage[];
  status: "done" | "confirm";
  pending: PendingAction[];
};

export default class AssistantModel extends BaseModel {
  static apiVersion = "/ai/api/v1";

  /** approve — id вызовов, которые человек подтвердил; остальные ассистент считает отказом. */
  static chat(messages: ChatMessage[], approve?: string[]) {
    return this.post<ChatResponse>({
      params: "/chat",
      body: { messages, ...(approve ? { approve } : {}) },
    });
  }
}

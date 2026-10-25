import BaseModel, { HttpError } from "./BaseModel";

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
  static chat(messages: ChatMessage[], approve?: string[], locale?: string) {
    return this.post<ChatResponse>({
      params: "/chat",
      body: {
        messages,
        ...(approve ? { approve } : {}),
        ...(locale ? { locale } : {}),
      },
    });
  }

  /**
   * Запись голоса → текст. Не через BaseModel.post: тот ставит JSON-заголовок и сериализует тело,
   * а multipart должен получить границу от самого браузера — берём из общих заголовков только
   * Authorization (и язык), Content-Type не трогаем.
   */
  static async transcribe(audio: Blob, language: string): Promise<string> {
    const shared = (this.baseOpts.headers ?? {}) as Record<string, string>;
    const headers: Record<string, string> = {};
    if (shared["Authorization"])
      headers["Authorization"] = shared["Authorization"];

    const body = new FormData();
    body.append("file", audio, `voice.${extension(audio.type)}`);
    body.append("language", language);

    const response = await fetch(
      `${this.baseURL}${this.apiVersion}/transcribe`,
      {
        method: "POST",
        headers,
        body,
      },
    );
    if (!response.ok) throw new HttpError(response.status, response.statusText);
    return ((await response.json()) as { text: string }).text;
  }
}

/** Сервис различает формат по имени; Chrome пишет webm/ogg, Safari — mp4. */
function extension(mime: string): string {
  const sub = /\/([a-z0-9]+)/i.exec(mime)?.[1].toLowerCase();
  return sub === "mpeg" ? "mp3" : (sub ?? "webm");
}

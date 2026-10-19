import { defineStore } from "pinia";
import AssistantModel, {
  type ChatMessage,
  type PendingAction,
} from "@/models/AssistantModel";
import { HttpError } from "@/models/BaseModel";

export type AssistantError = "failed" | "unconfigured" | "unauthorized";

interface AssistantState {
  /** Полная история в формате API — её же отправляем обратно на каждом ходе. */
  history: ChatMessage[];
  pending: PendingAction[];
  loading: boolean;
  error: AssistantError | null;
}

function errorKind(error: unknown): AssistantError {
  if (error instanceof HttpError) {
    if (error.status === 503) return "unconfigured";
    if (error.status === 401) return "unauthorized";
  }
  return "failed";
}

/**
 * Диалог живёт только в памяти: на сервере его нет, а в localStorage он оседал бы с
 * данными заявок и складов после выхода. Обновили страницу — диалог начался заново.
 */
export const useAssistantStore = defineStore("assistant", {
  state: (): AssistantState => ({
    history: [],
    pending: [],
    loading: false,
    error: null,
  }),
  getters: {
    /** Только то, что человек читает: вызовы инструментов и их ответы — служебные. */
    visibleMessages: (state) =>
      state.history.filter(
        (m): m is Extract<ChatMessage, { role: "user" | "assistant" }> =>
          (m.role === "user" || m.role === "assistant") && Boolean(m.content),
      ),
  },
  actions: {
    /** false — не отправилось, текст вернуть в поле ввода. */
    async send(text: string): Promise<boolean> {
      const content = text.trim();
      if (!content || this.loading || this.pending.length) return false;

      this.history.push({ role: "user", content });
      const ok = await this.run();
      // Не дошло — убираем своё сообщение, иначе повтор отправил бы его дважды.
      if (!ok) this.history.pop();
      return ok;
    },
    /** Ответ на запрос подтверждения: approve — id разрешённых, остальное отклоняется. */
    async resolve(approve: string[]) {
      if (this.loading || !this.pending.length) return;
      await this.run(approve);
    },
    async run(approve?: string[]): Promise<boolean> {
      this.loading = true;
      this.error = null;
      try {
        const response = await AssistantModel.chat([...this.history], approve);
        this.history.push(...response.messages);
        this.pending = response.status === "confirm" ? response.pending : [];
        return true;
      } catch (error) {
        this.error = errorKind(error);
        return false;
      } finally {
        this.loading = false;
      }
    },
    reset() {
      this.history = [];
      this.pending = [];
      this.error = null;
      this.loading = false;
    },
  },
});

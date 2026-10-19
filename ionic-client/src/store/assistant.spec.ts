import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import AssistantModel from "@/models/AssistantModel";
import { HttpError } from "@/models/BaseModel";
import { useAssistantStore } from "./assistant";

describe("assistant store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("отправляет историю целиком и дописывает ответ", async () => {
    const chat = vi.spyOn(AssistantModel, "chat").mockResolvedValue({
      messages: [{ role: "assistant", content: "Привет" }],
      status: "done",
      pending: [],
    });
    const store = useAssistantStore();

    expect(await store.send(" привет ")).toBe(true);

    expect(chat).toHaveBeenCalledWith(
      [{ role: "user", content: "привет" }],
      undefined,
    );
    expect(store.visibleMessages.map((m) => m.content)).toEqual([
      "привет",
      "Привет",
    ]);
  });

  it("служебные сообщения не показываются", async () => {
    vi.spyOn(AssistantModel, "chat").mockResolvedValue({
      messages: [
        { role: "assistant", content: null, tool_calls: [] },
        { role: "tool", tool_call_id: "a", content: "{}" },
        { role: "assistant", content: "Готово" },
      ],
      status: "done",
      pending: [],
    });
    const store = useAssistantStore();
    await store.send("x");

    expect(store.visibleMessages.map((m) => m.content)).toEqual([
      "x",
      "Готово",
    ]);
  });

  it("ждёт подтверждения и шлёт approve", async () => {
    const chat = vi
      .spyOn(AssistantModel, "chat")
      .mockResolvedValueOnce({
        messages: [{ role: "assistant", content: null, tool_calls: [] }],
        status: "confirm",
        pending: [
          {
            id: "d",
            name: "delete_zayavka",
            args: { id: 1 },
            summary: "Удалить заявку №1",
          },
        ],
      })
      .mockResolvedValueOnce({
        messages: [{ role: "assistant", content: "Удалено" }],
        status: "done",
        pending: [],
      });
    const store = useAssistantStore();

    await store.send("удали");
    expect(store.pending).toHaveLength(1);
    // Пока решение не принято, новое сообщение не уходит.
    expect(await store.send("ещё")).toBe(false);

    await store.resolve(["d"]);
    expect(chat).toHaveBeenLastCalledWith(expect.any(Array), ["d"]);
    expect(store.pending).toEqual([]);
  });

  it("ошибка откатывает сообщение и классифицируется", async () => {
    vi.spyOn(AssistantModel, "chat").mockRejectedValue(new HttpError(503, ""));
    const store = useAssistantStore();

    expect(await store.send("x")).toBe(false);
    expect(store.history).toEqual([]);
    expect(store.error).toBe("unconfigured");
  });
});

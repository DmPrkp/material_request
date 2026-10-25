import { computed, onBeforeUnmount, ref } from "vue";
import AssistantModel from "@/models/AssistantModel";

export type VoiceError = "mic_denied" | "voice_failed";

/**
 * Голосовой ввод: нажал — пишем, нажал ещё раз — запись уходит на распознавание, а текст
 * попадает в onText (в поле ввода, не в чат: распознавание ошибается, и человек должен прочитать
 * фразу до отправки). Микрофон отдаётся только на https и localhost; без него кнопку скрываем.
 */
export function useVoiceInput(
  language: () => string,
  onText: (text: string) => void,
) {
  const supported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined";

  const recording = ref(false);
  const transcribing = ref(false);
  const error = ref<VoiceError | null>(null);
  const busy = computed(() => recording.value || transcribing.value);

  let recorder: MediaRecorder | undefined;
  let stream: MediaStream | undefined;

  function release() {
    stream?.getTracks().forEach((track) => track.stop());
    stream = undefined;
    recorder = undefined;
    recording.value = false;
  }

  async function start() {
    error.value = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      error.value = "mic_denied";
      return;
    }

    const chunks: Blob[] = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      const type = recorder?.mimeType || chunks[0]?.type || "audio/webm";
      release();
      if (!chunks.length) return;

      transcribing.value = true;
      try {
        const text = await AssistantModel.transcribe(
          new Blob(chunks, { type }),
          language(),
        );
        if (text) onText(text);
      } catch {
        error.value = "voice_failed";
      } finally {
        transcribing.value = false;
      }
    };
    recorder.start();
    recording.value = true;
  }

  function toggle() {
    if (transcribing.value) return;
    if (recording.value) recorder?.stop();
    else void start();
  }

  // Ушли со страницы посреди записи — микрофон не должен остаться включённым.
  onBeforeUnmount(() => {
    if (recorder) {
      recorder.onstop = null;
      recorder.stop();
    }
    release();
  });

  return { supported, recording, transcribing, busy, error, toggle };
}

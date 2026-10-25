import { BadRequestException, Inject, Injectable, PayloadTooLargeException } from '@nestjs/common';

import { LLM, type Llm } from './llm';

/** Реплика в чате — секунды, не часовая запись; потолок держит и nginx (client_max_body_size). */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const LANGUAGES = new Set(['ru', 'en']);

/** Что отдают MediaRecorder и системные диктофоны: Chrome — webm/ogg, Safari — mp4/m4a. */
const AUDIO_TYPES = /^(audio|video)\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|wave|x-m4a|m4a|aac|flac)\b/i;

export type UploadedAudio = { buffer: Buffer; originalname?: string; mimetype: string; size: number };

@Injectable()
export class TranscribeService {
  constructor(@Inject(LLM) private readonly llm: Llm) {}

  async transcribe(file: UploadedAudio | undefined, language = 'ru'): Promise<{ text: string }> {
    if (!file) throw new BadRequestException('Нужен аудиофайл в поле file');
    if (file.size > MAX_AUDIO_BYTES) throw new PayloadTooLargeException('Запись слишком длинная');
    if (!isAudio(file)) throw new BadRequestException('Это не аудио');
    if (!LANGUAGES.has(language)) throw new BadRequestException('language: ru или en');

    const text = await this.llm.transcribe(
      {
        buffer: file.buffer,
        filename: file.originalname || `audio.${extension(file.mimetype)}`,
        mimetype: file.mimetype,
      },
      language,
    );
    return { text: text.trim() };
  }
}

const AUDIO_EXTENSIONS = /\.(webm|ogg|oga|mp4|m4a|mp3|wav|aac|flac)$/i;

/** Часть клиентов (curl, старые мобильные браузеры) шлёт octet-stream — тогда смотрим на имя. */
function isAudio(file: UploadedAudio): boolean {
  if (AUDIO_TYPES.test(file.mimetype)) return true;
  return file.mimetype === 'application/octet-stream' && AUDIO_EXTENSIONS.test(file.originalname ?? '');
}

/** Шлюз определяет формат по имени файла, а blob из браузера приходит с безликим «blob». */
function extension(mimetype: string): string {
  const sub = /\/([a-z0-9-]+)/i.exec(mimetype)?.[1].toLowerCase() ?? 'webm';
  return { 'x-wav': 'wav', wave: 'wav', mpeg: 'mp3', 'x-m4a': 'm4a' }[sub] ?? sub;
}

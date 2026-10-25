import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { Llm } from './llm';
import { MAX_AUDIO_BYTES, TranscribeService } from './transcribe.service';

const file = (patch = {}) => ({
  buffer: Buffer.from('x'),
  originalname: 'blob',
  mimetype: 'audio/webm;codecs=opus',
  size: 1,
  ...patch,
});

describe('TranscribeService', () => {
  const transcribe = vi.fn().mockResolvedValue('  сколько у меня заявок  ');
  const service = new TranscribeService({ transcribe } as unknown as Llm);

  it('отдаёт текст без пробелов по краям', async () => {
    expect(await service.transcribe(file(), 'ru')).toEqual({ text: 'сколько у меня заявок' });
    expect(transcribe).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'audio/webm;codecs=opus' }),
      'ru',
    );
  });

  it('безымянный blob получает расширение по типу', async () => {
    await service.transcribe(file({ originalname: '', mimetype: 'audio/mp4' }));
    expect(transcribe).toHaveBeenLastCalledWith(expect.objectContaining({ filename: 'audio.mp4' }), 'ru');
  });

  it('отвергает пустой запрос, чужой тип, большой файл и неизвестный язык', async () => {
    await expect(service.transcribe(undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.transcribe(file({ mimetype: 'image/png' }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.transcribe(file({ size: MAX_AUDIO_BYTES + 1 }))).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
    await expect(service.transcribe(file(), 'xx')).rejects.toBeInstanceOf(BadRequestException);
  });
});

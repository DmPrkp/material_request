import { describe, expect, it, vi } from 'vitest';

import type { Database } from '~/db/db.module';
import { createFeedbackSchema } from './dto/feedback.dto';
import { FeedbackService } from './feedback.service';

describe('обратная связь', () => {
  describe('разбор тела', () => {
    it('принимает обе темы и обрезает пробелы в тексте', () => {
      const parsed = createFeedbackSchema.parse({ topic: 'bug', message: '  не считает  ' });

      expect(parsed).toEqual({ topic: 'bug', message: 'не считает' });
      expect(createFeedbackSchema.parse({ topic: 'idea', message: 'х' }).topic).toBe('idea');
    });

    it('тема вне списка не проходит: по ней фильтрует админка', () => {
      expect(() => createFeedbackSchema.parse({ topic: 'вопрос', message: 'текст' })).toThrow();
    });

    it('пустой текст и текст из одних пробелов не проходят', () => {
      expect(() => createFeedbackSchema.parse({ topic: 'bug', message: '' })).toThrow();
      expect(() => createFeedbackSchema.parse({ topic: 'bug', message: '   ' })).toThrow();
    });

    it('мегабайт из буфера обмена не уедет в базу', () => {
      expect(() => createFeedbackSchema.parse({ topic: 'bug', message: 'я'.repeat(4001) })).toThrow();
    });

    it('автора в теле не принимаем — его подставит сервер из токена', () => {
      expect(() =>
        createFeedbackSchema.parse({ topic: 'bug', message: 'текст', userId: 1 }),
      ).toThrow();
    });
  });

  it('пишет автора из токена, а не из тела', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 7 }]);
    const values = vi.fn(() => ({ returning }));
    const db = { insert: vi.fn(() => ({ values })) } as unknown as Database;

    await new FeedbackService(db).create(42, { topic: 'idea', message: 'тёмная тема' });

    expect(values).toHaveBeenCalledWith({ userId: 42, topic: 'idea', message: 'тёмная тема' });
  });
});

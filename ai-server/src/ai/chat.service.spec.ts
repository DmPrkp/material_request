import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatDto } from './chat.dto';
import { ChatService, MAX_STEPS } from './chat.service';
import type { AssistantReply, Llm } from './llm';
import type { ServiceClient } from './service-client';

const user = { id: 7, role: 'USER' as const };
const call = (id: string, name: string, args: unknown = {}) => ({
  id,
  type: 'function' as const,
  function: { name, arguments: JSON.stringify(args) },
});

describe('ChatService', () => {
  let replies: AssistantReply[];
  let request: ReturnType<typeof vi.fn>;
  let service: ChatService;

  beforeEach(() => {
    replies = [];
    request = vi.fn().mockResolvedValue({ ok: true, status: 200, body: [{ id: 1 }] });
    const llm: Llm = { complete: vi.fn(() => Promise.resolve(replies.shift() ?? { content: 'конец' })) };
    service = new ChatService(llm, { request } as unknown as ServiceClient);
  });

  const dto = (messages: unknown[], approve?: string[]) => ({ messages, approve }) as ChatDto;

  it('читает сразу и от имени пользователя', async () => {
    replies = [{ content: null, tool_calls: [call('a', 'list_zayavki')] }, { content: 'Одна заявка' }];
    const res = await service.chat(user, dto([{ role: 'user', content: 'мои заявки' }]));

    expect(request).toHaveBeenCalledWith(user, 'order', 'GET', '/zayavka');
    expect(res.status).toBe('done');
    expect(res.messages.map((m) => m.role)).toEqual(['assistant', 'tool', 'assistant']);
  });

  it('запись не выполняет, а ждёт подтверждения', async () => {
    replies = [{ content: null, tool_calls: [call('d', 'delete_zayavka', { id: 5 })] }];
    const res = await service.chat(user, dto([{ role: 'user', content: 'удали 5' }]));

    expect(request).not.toHaveBeenCalled();
    expect(res.status).toBe('confirm');
    expect(res.pending).toEqual([
      { id: 'd', name: 'delete_zayavka', args: { id: 5 }, summary: 'Удалить заявку №5' },
    ]);
  });

  it('выполняет подтверждённое и продолжает диалог', async () => {
    const history = [
      { role: 'user', content: 'удали 5' },
      { role: 'assistant', content: null, tool_calls: [call('d', 'delete_zayavka', { id: 5 })] },
    ];
    replies = [{ content: 'Удалила' }];
    const res = await service.chat(user, dto(history, ['d']));

    expect(request).toHaveBeenCalledWith(user, 'order', 'DELETE', '/zayavka/5');
    expect(res.status).toBe('done');
  });

  it('неподтверждённое считается отказом и не выполняется', async () => {
    const history = [
      { role: 'user', content: 'удали 5' },
      { role: 'assistant', content: null, tool_calls: [call('d', 'delete_zayavka', { id: 5 })] },
    ];
    const res = await service.chat(user, dto(history, []));

    expect(request).not.toHaveBeenCalled();
    expect(res.messages[0]).toMatchObject({ role: 'tool', tool_call_id: 'd' });
  });

  it('чтение рядом с записью выполняется, запись ждёт; ответы tool идут подряд', async () => {
    replies = [
      {
        content: null,
        tool_calls: [call('r', 'get_zayavka', { id: 1 }), call('w', 'delete_zayavka', { id: 1 })],
      },
    ];
    const res = await service.chat(user, dto([{ role: 'user', content: 'x' }]));

    expect(request).toHaveBeenCalledTimes(1);
    expect(res.pending.map((p) => p.id)).toEqual(['w']);

    const resumed = await service.chat(user, dto([{ role: 'user', content: 'x' }, ...res.messages], ['w']));
    expect(request).toHaveBeenLastCalledWith(user, 'order', 'DELETE', '/zayavka/1');
    expect(resumed.status).toBe('done');
  });

  it('неизвестный инструмент и кривые аргументы — ответ модели, не исключение', async () => {
    replies = [
      { content: null, tool_calls: [call('x', 'drop_database'), call('y', 'get_zayavka', { id: 'abc' })] },
      { content: 'ок' },
    ];
    const res = await service.chat(user, dto([{ role: 'user', content: 'x' }]));

    expect(request).not.toHaveBeenCalled();
    expect(res.messages.filter((m) => m.role === 'tool')).toHaveLength(2);
  });

  it('ошибка сервиса уходит модели текстом', async () => {
    request.mockResolvedValue({ ok: false, status: 404, body: 'нет' });
    replies = [
      { content: null, tool_calls: [call('a', 'get_zayavka', { id: 9 })] },
      { content: 'нет такой' },
    ];
    const res = await service.chat(user, dto([{ role: 'user', content: 'x' }]));

    expect(res.messages[1]).toMatchObject({ role: 'tool', content: 'Ошибка 404: нет' });
  });

  it('зацикливание обрывается', async () => {
    replies = Array.from({ length: MAX_STEPS + 2 }, (_, i) => ({
      content: null,
      tool_calls: [call(`c${i}`, 'list_zayavki')],
    }));
    const res = await service.chat(user, dto([{ role: 'user', content: 'x' }]));

    expect(res.status).toBe('done');
    expect(res.messages.at(-1)).toMatchObject({ role: 'assistant' });
  });

  it('диалог не с сообщения пользователя — 400', async () => {
    await expect(
      service.chat(
        user,
        dto([
          { role: 'user', content: 'x' },
          { role: 'assistant', content: 'привет' },
        ]),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

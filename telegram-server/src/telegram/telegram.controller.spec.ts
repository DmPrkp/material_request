import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { TelegramController } from './telegram.controller';
import type { TelegramService } from './telegram.service';

function make(secret: string) {
  const handle = vi.fn();
  const controller = new TelegramController({ secret, handle } as unknown as TelegramService);
  return { controller, handle };
}

const update = { update_id: 1, message: { chat: { id: 7 }, text: 'hi' } };

describe('TelegramController.webhook', () => {
  it('с верным секретом передаёт обновление в обработчик', async () => {
    const { controller, handle } = make('s3cret');
    await controller.webhook('s3cret', update);
    expect(handle).toHaveBeenCalledWith(update);
  });

  it('с чужим или пустым секретом — 401', async () => {
    const { controller, handle } = make('s3cret');
    await expect(controller.webhook('nope', update)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.webhook(undefined, update)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(handle).not.toHaveBeenCalled();
  });

  it('без настроенного секрета ручка закрыта — 503', async () => {
    const { controller } = make('');
    await expect(controller.webhook('', update)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

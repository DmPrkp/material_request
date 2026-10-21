import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  it('без токена отправка — 503', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const service = new TelegramService();
    await expect(service.sendMessage(1, 'hi')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

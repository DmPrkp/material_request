import {
  BadGatewayException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';

import { logError } from '~/common/error-log';

export interface Update {
  update_id: number;
  message?: { chat: { id: number }; text?: string };
}

interface ApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

// Telegram держит запрос открытым до этого числа секунд, если обновлений нет.
const POLL_TIMEOUT_S = 30;
const RETRY_DELAY_MS = 5000;
const RETRY_DELAY_MAX_MS = 60_000;

/**
 * Входящие по умолчанию — long polling (`getUpdates`): не нужен ни публичный https, ни
 * маршрут в nginx. Если задан `TELEGRAM_WEBHOOK_URL` (https) и секрет — вместо опроса при
 * старте регистрируется webhook `POST /telegram/api/v1/webhook`. Без `TELEGRAM_BOT_TOKEN`
 * сервис поднимается, но бот молчит, а отправка отвечает 503.
 */
@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  private readonly webhookUrl = process.env.TELEGRAM_WEBHOOK_URL?.trim() ?? '';
  private abort = new AbortController();
  private stopped = false;
  readonly secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? '';

  async onApplicationBootstrap(): Promise<void> {
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN не задан — бот не запущен');
      return;
    }
    // Telegram принимает webhook только на https, а без секрета любой мог бы слать «обновления».
    if (this.webhookUrl.startsWith('https://') && this.secret) {
      await this.registerWebhook();
      return;
    }
    void this.poll();
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    this.abort.abort();
  }

  private async registerWebhook(): Promise<void> {
    try {
      await this.call('setWebhook', {
        url: this.webhookUrl,
        secret_token: this.secret,
        allowed_updates: ['message'],
      });
      this.logger.log(`Webhook: ${this.webhookUrl}`);
    } catch (error) {
      // Не роняем сервис: стек из-за бота не падает, ошибка — в лог поломок.
      logError('telegram-set-webhook', error);
    }
  }

  private async poll(): Promise<void> {
    let offset = 0;
    let failures = 0;
    try {
      // getUpdates не работает при установленном webhook (409): снимаем его.
      await this.call('deleteWebhook', {}, this.abort.signal);
    } catch {
      // Недоступность Telegram всплывёт в цикле ниже.
    }
    this.logger.log('Бот слушает обновления (long polling)');
    while (!this.stopped) {
      try {
        const updates = await this.call<Update[]>(
          'getUpdates',
          { offset, timeout: POLL_TIMEOUT_S, allowed_updates: ['message'] },
          this.abort.signal,
        );
        failures = 0;
        for (const update of updates) {
          offset = update.update_id + 1;
          await this.handle(update);
        }
      } catch (error) {
        if (this.stopped) return;
        failures += 1;
        // Недоступный Telegram — не повод писать в лог каждые 5 секунд: первый сбой и
        // далее каждый двадцатый, а паузу растим до минуты.
        if (failures === 1 || failures % 20 === 0) logError('telegram-poll', error);
        const delay = Math.min(RETRY_DELAY_MS * failures, RETRY_DELAY_MAX_MS);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async sendMessage(chatId: number | string, text: string): Promise<void> {
    if (!this.token) throw new ServiceUnavailableException('Telegram не настроен');
    try {
      await this.call('sendMessage', { chat_id: chatId, text });
    } catch (error) {
      // Отказ Telegram — не наша поломка, как и отказ релея в mail-server.
      throw new BadGatewayException(error instanceof Error ? error.message : 'Telegram не принял');
    }
  }

  /** Пока эхо: заготовка под настоящие команды. Ошибки не пробрасываем — иначе Telegram повторит доставку. */
  async handle(update: Update): Promise<void> {
    const message = update.message;
    if (!message?.text) return;
    try {
      await this.sendMessage(message.chat.id, `Вы написали: ${message.text}`);
    } catch (error) {
      logError('telegram-handle', error);
    }
  }

  private async call<T>(method: string, body: object, signal?: AbortSignal): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    const data = (await res.json()) as ApiResponse<T>;
    // URL с токеном в ошибку не кладём.
    if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
    return data.result as T;
  }
}

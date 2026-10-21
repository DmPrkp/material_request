import {
  BadGatewayException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
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

/**
 * Входящие — webhook: Telegram сам шлёт обновления на `POST /telegram/api/v1/webhook`
 * (в nginx открыта только эта ручка). Адрес и секрет регистрируются при старте, так что
 * руками `setWebhook` дёргать не нужно. Без `TELEGRAM_BOT_TOKEN` сервис поднимается, но
 * отправка отвечает 503; без https-адреса (dev) webhook не ставится и бот молчит — слать
 * обновления в ручку можно вручную с заголовком секрета.
 */
@Injectable()
export class TelegramService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  private readonly webhookUrl = process.env.TELEGRAM_WEBHOOK_URL?.trim() ?? '';
  readonly secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? '';

  async onApplicationBootstrap(): Promise<void> {
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN не задан — бот не запущен');
      return;
    }
    // Telegram принимает webhook только на https, а без секрета любой мог бы слать «обновления».
    if (!this.webhookUrl.startsWith('https://') || !this.secret) {
      this.logger.warn('Нет https-адреса или TELEGRAM_WEBHOOK_SECRET — webhook не зарегистрирован');
      return;
    }
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

  private async call<T>(method: string, body: object): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as ApiResponse<T>;
    // URL с токеном в ошибку не кладём.
    if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
    return data.result as T;
  }
}

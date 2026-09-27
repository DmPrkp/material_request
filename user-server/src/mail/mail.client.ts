import { Injectable, Logger } from '@nestjs/common';

import { logError } from '../common/error-log';
import type { Locale } from './links';

/** Письма шлёт mail-server, по внутренней сети compose — мимо nginx, как все сервисы. */
const DEFAULT_URL = 'http://mail-server:4700/mail/api/v1';

export type Message = {
  to: string;
  template: 'verify' | 'reset';
  locale: Locale;
  link: string;
  name?: string;
  hours: number;
};

@Injectable()
export class MailClient {
  private readonly baseUrl = (process.env.MAIL_URL || DEFAULT_URL).replace(/\/$/, '');
  private readonly logger = new Logger(MailClient.name);

  /**
   * Не бросает никогда. Упавшее письмо не повод завалить регистрацию или смену почты:
   * аккаунт уже заведён, и ответ «500» вынудил бы человека регистрироваться заново.
   * Поэтому отказ уходит в файл лога (видно в админке, «Лог ошибок»), а наружу — false.
   */
  async send(message: Message): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        logError(
          'mail',
          new Error(`mail-server ответил ${response.status} на ${message.template} для ${message.to}`),
        );
        return false;
      }

      this.logger.log(`письмо ${message.template} отправлено на ${message.to}`);
      return true;
    } catch (error) {
      logError('mail', error);
      return false;
    }
  }
}

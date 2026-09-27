import { Injectable } from '@nestjs/common';

import { TokensService } from '~/tokens/tokens.service';
import type { Locale } from './links';
import { verifyLink } from './links';
import { MailClient } from './mail.client';

/**
 * «Выписать ссылку и отправить письмо с подтверждением адреса» — нужно в двух местах:
 * при регистрации с почтой и при её смене в профиле. Вынесено сюда, чтобы не держать
 * две копии и чтобы зависимость шла в одну сторону: пользователей этот сервис не знает,
 * ему передают уже готовые id, адрес и имя.
 */
@Injectable()
export class VerificationMailer {
  constructor(
    private readonly tokens: TokensService,
    private readonly mail: MailClient,
  ) {}

  /** false — письмо не ушло. Наверх это не ошибка: адрес сохранён, письмо можно переслать. */
  async send(userId: number, email: string, name: string, locale: Locale): Promise<boolean> {
    const { token, hours } = await this.tokens.issue(userId, 'verify', email);
    return this.mail.send({
      to: email,
      template: 'verify',
      locale,
      link: verifyLink(token, locale),
      name,
      hours,
    });
  }
}

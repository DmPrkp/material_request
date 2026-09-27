import { BadGatewayException, BadRequestException } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mailConfigFromEnv } from './config';
import type { SendDto } from './dto/send.dto';
import { MailService } from './mail.service';

const config = mailConfigFromEnv({
  MAIL_HOST: 'connect.smtp.bz',
  MAIL_USER: 'account@example.com',
  MAIL_REPLY_TO: 'live@example.com',
  APP_URL: 'https://zayavka.app',
});

const dto = (patch: Partial<SendDto> = {}): SendDto =>
  ({
    to: 'person@example.com',
    template: 'verify',
    locale: 'ru',
    link: 'https://zayavka.app/ru/auth/verify?token=abc',
    hours: 24,
    ...patch,
  });

describe('MailService', () => {
  let sendMail: ReturnType<typeof vi.fn>;
  let service: MailService;

  beforeEach(() => {
    sendMail = vi.fn().mockResolvedValue({ messageId: '<id@zayavka.app>' });
    service = new MailService(config, { sendMail } as unknown as Transporter);
  });

  it('отдаёт письмо релею и возвращает его идентификатор', async () => {
    await expect(service.send(dto())).resolves.toEqual({ messageId: '<id@zayavka.app>' });

    const letter = sendMail.mock.calls[0][0];
    expect(letter.to).toBe('person@example.com');
    expect(letter.from).toEqual({ name: 'Заявка', address: 'noreply@zayavka.app' });
    // Ящика на noreply нет, ответы должны уходить на живой адрес.
    expect(letter.replyTo).toBe('live@example.com');
    // Обе версии: без текстовой письма чаще попадают в спам.
    expect(letter.text).toContain('https://zayavka.app/ru/auth/verify?token=abc');
    expect(letter.html).toContain('https://zayavka.app/ru/auth/verify?token=abc');
  });

  it('чужой домен в ссылке — 400 и письмо не уходит', async () => {
    await expect(service.send(dto({ link: 'https://zloy.example.com/ru/auth/verify' }))).rejects.toThrow(
      BadRequestException,
    );

    expect(sendMail).not.toHaveBeenCalled();
  });

  it('домен, который лишь начинается с нашего, тоже не проходит', async () => {
    // Сравниваем origin, а не начало строки: zayavka.app.zloy.example — чужой сайт.
    await expect(service.send(dto({ link: 'https://zayavka.app.zloy.example/ru' }))).rejects.toThrow(
      BadRequestException,
    );

    expect(sendMail).not.toHaveBeenCalled();
  });

  it('отказ релея — 502, а не 500: у нас всё цело, письмо не принял чужой сервер', async () => {
    sendMail.mockRejectedValue(new Error('550 not verified'));

    await expect(service.send(dto())).rejects.toThrow(BadGatewayException);
  });
});

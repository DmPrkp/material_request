import { BadGatewayException, BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { Transporter } from 'nodemailer';

import { MAIL_CONFIG, type MailConfig } from './config';
import type { SendDto } from './dto/send.dto';
import { renderLetter } from './templates';

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

/**
 * Ссылка обязана вести на само приложение. Сравниваем origin, а не начало строки:
 * `https://zayavka.app.example.com/` начинается с нашего адреса, но это чужой сайт.
 */
function isAppLink(link: string, appUrl: string): boolean {
  try {
    return new URL(link).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_CONFIG) private readonly config: MailConfig,
    @Inject(MAIL_TRANSPORT) private readonly transport: Transporter,
  ) {}

  async send(dto: SendDto): Promise<{ messageId: string }> {
    if (!isAppLink(dto.link, this.config.appUrl)) {
      throw new BadRequestException(`Ссылка ведёт не на ${this.config.appUrl}`);
    }

    const letter = renderLetter(dto.template, dto.locale, {
      link: dto.link,
      name: dto.name,
      hours: dto.hours,
    });

    try {
      const info = await this.transport.sendMail({
        from: { name: this.config.fromName, address: this.config.from },
        to: dto.to,
        // Ящика на домене у нас нет — на noreply никто не ответит. Пусть ответы и отбивки
        // уходят на живой адрес, иначе они пропадают совсем.
        replyTo: this.config.replyTo,
        subject: letter.subject,
        text: letter.text,
        html: letter.html,
      });

      this.logger.log(`${dto.template}/${dto.locale} -> ${dto.to} (${info.messageId})`);
      return { messageId: String(info.messageId) };
    } catch (error) {
      // 502, а не 500: у нас всё в порядке, письмо не принял релей. Вызывающий сервис
      // по коду поймёт, что дело не в его запросе, и покажет человеку «попробуйте позже».
      throw new BadGatewayException(`Релей не принял письмо: ${(error as Error).message}`);
    }
  }
}

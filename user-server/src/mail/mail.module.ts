import { Module } from '@nestjs/common';

import { TokensModule } from '~/tokens/tokens.module';
import { MailClient } from './mail.client';
import { VerificationMailer } from './verification.mailer';

@Module({
  imports: [TokensModule],
  providers: [MailClient, VerificationMailer],
  exports: [MailClient, VerificationMailer],
})
export class MailModule {}

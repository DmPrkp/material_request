import { Module } from '@nestjs/common';
import { MailModule } from '~/mail/mail.module';
import { DefaultAdminService } from './default-admin.service';
import { ProfileService } from './profile.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [MailModule],
  controllers: [UsersController],
  providers: [UsersService, DefaultAdminService, ProfileService],
  exports: [UsersService],
})
export class UsersModule {}

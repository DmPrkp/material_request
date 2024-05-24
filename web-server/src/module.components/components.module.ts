import { Module } from '@nestjs/common';

import { SystemComponentsRepositories } from './repositories/system-components.repository';
import { SystemComponentsController } from './controller/system-components.controller';
import { PostgresClient } from '~/db/PostgresClient';
import { PGClientFactory } from '~/db/db.factory';
import { SystemValidationPipe } from '~/validation/system.pipe';

@Module({
  controllers: [SystemComponentsController],
  providers: [
    SystemComponentsRepositories,
    PGClientFactory,
    PostgresClient,
    SystemValidationPipe,
  ],
})
export class SystemComponentsModule {}

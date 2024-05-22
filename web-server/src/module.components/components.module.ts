import { Module } from '@nestjs/common';

import { SystemComponentsRepositories } from './repositories/system-components.repository';
import { SystemComponentsController } from './controller/system-components.controller';
import { PostgresClient } from '~/db/PostgresClient';
import { PGClientFactory } from '~/db/db.factory';

@Module({
  controllers: [SystemComponentsController],
  providers: [SystemComponentsRepositories, PGClientFactory, PostgresClient],
})
export class SystemComponentsModule {}

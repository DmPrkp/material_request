import { Module } from '@nestjs/common';

import { SystemComponentsRepositories } from './repositories/system-components.repository';
import { SystemComponentsController } from './controller/system-components.controller';
import { SystemValidationPipe } from '~/validation/system.pipe';
import { DatabaseModule } from '~/db/PostgresClient';

@Module({
  imports: [DatabaseModule],
  controllers: [SystemComponentsController],
  providers: [SystemComponentsRepositories, SystemValidationPipe],
})
export class SystemComponentsModule {}

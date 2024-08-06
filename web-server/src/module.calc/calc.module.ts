import { Module } from '@nestjs/common';

import { CalcRepositories } from './repositories/calc.repository';
import { CalcController } from './controller/calc.controller';
import { PostgresClient } from '~/db/PostgresClient';
import { PGClientFactory } from '~/db/db.factory';
// import { SystemValidationPipe } from '~/validation/system.pipe';

@Module({
  controllers: [CalcController],
  providers: [CalcRepositories, PGClientFactory, PostgresClient],
})
export class CalcModule {}

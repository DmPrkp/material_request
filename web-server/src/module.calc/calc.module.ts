import { Module } from '@nestjs/common';

import { CalcRepositories } from './repositories/calc.repository';
import { CalcController } from './controller/calc.controller';
import { DatabaseModule } from '~/db/PostgresClient';
// import { SystemValidationPipe } from '~/validation/system.pipe';

@Module({
  imports: [DatabaseModule],
  controllers: [CalcController],
  providers: [CalcRepositories],
})
export class CalcModule {}

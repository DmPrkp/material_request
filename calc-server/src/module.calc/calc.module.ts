import { Module } from '@nestjs/common';

import { CalcRepositories } from './repositories/calc.repository';
import { CalcService } from './services/calc.service';
import { CalcController } from './controller/calc.controller';
import { DatabaseModule } from '~/db/PostgresClient';
import { CacheRepositories } from '~/cache';
// import { SystemValidationPipe } from '~/validation/system.pipe';

@Module({
  imports: [DatabaseModule],
  controllers: [CalcController],
  providers: [CalcRepositories, CalcService, CacheRepositories],
})
export class CalcModule {}
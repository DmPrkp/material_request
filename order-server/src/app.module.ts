import { Module } from '@nestjs/common';
import { ZayavkaController } from './zayavka/zayavka.controller';

@Module({
  imports: [],
  controllers: [ZayavkaController],
  providers: [],
})
export class AppModule {}

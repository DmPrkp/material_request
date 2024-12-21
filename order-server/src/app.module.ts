import { Module } from '@nestjs/common';
import { ZayavkaController } from './zayavka/zayavka.controller';
import { ZayavkaService } from './zayavka/zayavka.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [ZayavkaController],
  providers: [ZayavkaService, PrismaService],
})
export class AppModule {}

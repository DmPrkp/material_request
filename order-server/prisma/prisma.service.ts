import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    console.log('DB HOST', process.env.DB_USER);
    console.log('DB HOST', process.env.DB_PASSWORD);
    console.log('DB HOST', process.env.POSTGRES_DB);
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = PrismaService.resolveDatabaseUrl();
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  private static resolveDatabaseUrl() {
    const directUrl = process.env.DATABASE_URL;
    if (directUrl && directUrl.trim().length > 0) {
      return directUrl;
    }

    const user = process.env.POSTGRES_USER ?? 'postgres';
    const password = process.env.POSTGRES_PASSWORD ?? 'postgres';
    const host =
      process.env.DB_HOST ?? process.env.POSTGRES_HOST ?? 'localhost';
    const port = process.env.DB_PORT ?? process.env.POSTGRES_PORT ?? '5432';
    const database =
      process.env.POSTGRES_DB ?? process.env.DATABASE_NAME ?? 'postgres';

    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);

    return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: PrismaService.resolveDatabaseUrl(configService),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private static resolveDatabaseUrl(config: ConfigService) {
    const directUrl = config.get<string>('DATABASE_URL');
    if (directUrl && directUrl.trim().length > 0) {
      return directUrl;
    }

    const user = config.get<string>('POSTGRES_USER') ?? 'postgres';
    const password = config.get<string>('POSTGRES_PASSWORD') ?? 'postgres';
    const host =
      config.get<string>('DB_HOST') ??
      config.get<string>('POSTGRES_HOST') ??
      'localhost';
    const port =
      config.get<string>('DB_PORT') ??
      config.get<string>('POSTGRES_PORT') ??
      '5432';
    const database =
      config.get<string>('POSTGRES_DB') ??
      config.get<string>('DATABASE_NAME') ??
      'postgres';

    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);

    return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
  }
}
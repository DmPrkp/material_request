import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PGClientName } from './db.factory';
import { Pool } from 'pg';

@Injectable()
export class PostgresClient implements OnModuleDestroy {
  constructor(@Inject(PGClientName) private readonly PGClientFactory: Pool) {}

  onModuleDestroy(): void {
    this.PGClientFactory.end();
  }

  getClient() {
    return this.PGClientFactory;
  }

  async query<R>(q: string): Promise<R[]> {
    const { rows } = await this.PGClientFactory.query<R>(q);
    return rows;
  }
}

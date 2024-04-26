import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';

import { Client } from 'pg';
import { PGClient } from 'src/db/db.factory';

@Injectable()
export default class SystemComponentsRepositories implements OnModuleDestroy {
  constructor(@Inject(PGClient) private readonly PGClientFactory: Client) {}

  onModuleDestroy(): void {
    this.PGClientFactory.quit();
  }
}
